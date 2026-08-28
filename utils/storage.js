const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const logger = require('./logger');

let storage;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;

if (BUCKET_NAME) {
  try {
    storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID
    });
    logger.info('GCS Storage Initialized', { bucket: BUCKET_NAME });
  } catch (error) {
    logger.error('GCS INIT ERROR', { error: error.message });
  }
} else {
  logger.warn('GCS_BUCKET_NAME not set, using LOCAL storage fallback');
}

/**
 * Enterprise Media Optimization Pipeline
 * - Resizes images to max 1920px width
 * - Converts to WebP for superior compression
 * - Strips EXIF metadata
 */
const optimizeImage = async (buffer) => {
  try {
    return await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    logger.error('Image Optimization Failed', { error: error.message });
    return buffer; // Fallback to original if optimization fails
  }
};

const uploadFile = async (file, businessId) => {
  let fileBuffer = file.buffer;
  let fileName = file.originalname;
  let contentType = file.mimetype;

  // Trigger optimization if it's an image
  if (file.mimetype.startsWith('image/')) {
    logger.info('Optimizing Image Asset', { fileName });
    fileBuffer = await optimizeImage(file.buffer);
    fileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
    contentType = 'image/webp';
  }

  if (storage && BUCKET_NAME) {
    const bucket = storage.bucket(BUCKET_NAME);
    const gcsFileName = `${businessId}/${Date.now()}-${fileName}`;
    const blob = bucket.file(gcsFileName);
    
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: contentType,
      public: true, 
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => reject(err));
      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${gcsFileName}`;
        resolve(publicUrl);
      });
      blobStream.end(fileBuffer);
    });
  } else {
    // LOCAL FALLBACK
    const localDir = path.join(__dirname, '../public/uploads', businessId);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const finalFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(localDir, finalFileName);
    fs.writeFileSync(filePath, fileBuffer);
    
    return `/uploads/${businessId}/${finalFileName}`;
  }
};

module.exports = {
  uploadFile
};
