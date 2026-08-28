const request = require('supertest');
const app = require('./index');

describe('SepticFlow API Health Check', () => {
  it('should return 200 and online status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'SepticFlow Enterprise API Online');
  });
});

describe('Website Management Endpoints', () => {
  const businessId = 'test_biz_123';
  const userId = 'test_user_456';
  const mockSite = {
    config: {
      businessName: 'Test Business',
      phone: '555-0199',
      email: 'test@example.com',
      primaryColor: '#000000',
      heroText: 'Welcome to our test site'
    },
    blocks: [
      { id: '1', type: 'header', preview: 'Header block', status: 'Ready' }
    ]
  };

  it('should create and retrieve a website for a business', async () => {
    // 1. Create site
    const createRes = await request(app)
      .post('/api/websites')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send(mockSite);
    
    expect(createRes.statusCode).toEqual(200);
    expect(createRes.body).toHaveProperty('id');
    const siteId = createRes.body.id;

    // 2. Retrieve site
    const getRes = await request(app)
      .get('/api/websites')
      .set('x-business-id', businessId)
      .set('x-user-id', userId);
    
    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body.length).toBeGreaterThan(0);
    expect(getRes.body.find(s => s.id === siteId)).toBeDefined();
  });

  it('should enforce multi-tenancy (isolation)', async () => {
    // Business A creates a site
    const bizARes = await request(app)
      .post('/api/websites')
      .set('x-business-id', 'biz_A')
      .set('x-user-id', 'user_A')
      .send(mockSite);
    
    const siteIdA = bizARes.body.id;

    // Business B tries to fetch Business A's site via /api/websites (should only see their own)
    const bizBRes = await request(app)
      .get('/api/websites')
      .set('x-business-id', 'biz_B')
      .set('x-user-id', 'user_B');
    
    expect(bizBRes.body.find(s => s.id === siteIdA)).toBeUndefined();
  });

  it('should validate website data with Zod', async () => {
    const invalidSite = { config: { businessName: 'Invalid' } }; // Missing required fields
    const res = await request(app)
      .post('/api/websites')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send(invalidSite);
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('should handle publication logs and status', async () => {
    const createRes = await request(app)
      .post('/api/websites')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send(mockSite);
    
    const siteId = createRes.body.id;

    const pubRes = await request(app)
      .post('/api/website/publish')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send({ siteId });
    
    expect(pubRes.statusCode).toEqual(200);
    expect(pubRes.body.steps.length).toBeGreaterThan(0);
  });

  it('should manage and restore website revisions', async () => {
    // 1. Create initial site
    const createRes = await request(app)
      .post('/api/websites')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send(mockSite);
    const siteId = createRes.body.id;

    // 2. Update site to trigger revision creation
    const updatedSite = { ...mockSite, config: { ...mockSite.config, heroText: 'Updated Hero' } };
    await request(app)
      .post('/api/websites')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send({ ...updatedSite, id: siteId });

    // 3. Fetch revisions
    const revRes = await request(app)
      .get(`/api/website/${siteId}/revisions`)
      .set('x-business-id', businessId)
      .set('x-user-id', userId);
    
    expect(revRes.statusCode).toEqual(200);
    expect(revRes.body.length).toBeGreaterThan(0);
    const revisionId = revRes.body[0].id;

    // 4. Restore revision
    const restoreRes = await request(app)
      .post(`/api/website/${siteId}/restore`)
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send({ revisionId });
    
    expect(restoreRes.statusCode).toEqual(200);
    expect(restoreRes.body.message).toContain('successfully');
  });

  it('should provide public preview of a website', async () => {
    const createRes = await request(app)
      .post('/api/websites')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send(mockSite);
    const siteId = createRes.body.id;

    const previewRes = await request(app).get(`/api/public/preview/${siteId}`);
    expect(previewRes.statusCode).toEqual(200);
    expect(previewRes.body.config.businessName).toEqual(mockSite.config.businessName);
  });
});

describe('Admin Oversight Endpoints', () => {
  it('should restrict admin access to authorized users only', async () => {
    const res = await request(app)
      .get('/api/admin/websites')
      .set('x-business-id', 'some_biz')
      .set('x-user-id', 'regular_user');
    
    expect(res.statusCode).toEqual(403);
  });

  it('should allow admin to list all platform websites', async () => {
    const res = await request(app)
      .get('/api/admin/websites')
      .set('x-business-id', 'admin_biz')
      .set('x-user-id', 'admin_001');
    
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Asset Library Endpoints', () => {
  const businessId = 'test_biz_123';
  const userId = 'test_user_456';

  it('should upload an asset and retrieve it', async () => {
    // 1. Upload mock file
    const buffer = Buffer.from('fake image content');
    const uploadRes = await request(app)
      .post('/api/assets/upload')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .attach('file', buffer, 'test-image.png');
    
    expect(uploadRes.statusCode).toEqual(201);
    expect(uploadRes.body).toHaveProperty('publicUrl');
    expect(uploadRes.body.fileName).toEqual('test-image.png');

    // 2. Fetch assets
    const getRes = await request(app)
      .get('/api/assets')
      .set('x-business-id', businessId)
      .set('x-user-id', userId);
    
    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body.length).toBeGreaterThan(0);
    expect(getRes.body.find(a => a.fileName === 'test-image.png')).toBeDefined();
  });

  it('should isolate assets between businesses', async () => {
    // Business A uploads
    const buffer = Buffer.from('biz A file');
    await request(app)
      .post('/api/assets/upload')
      .set('x-business-id', 'biz_A')
      .set('x-user-id', 'user_A')
      .attach('file', buffer, 'biz-a-only.txt');
    
    // Business B tries to see Business A's assets
    const bizBRes = await request(app)
      .get('/api/assets')
      .set('x-business-id', 'biz_B')
      .set('x-user-id', 'user_B');
    
    expect(bizBRes.body.find(a => a.fileName === 'biz-a-only.txt')).toBeUndefined();
  });

  it('should optimize uploaded images to WebP', async () => {
    const fs = require('fs');
    const path = require('path');
    const imagePath = path.join(__dirname, 'test-image.png');
    
    const uploadRes = await request(app)
      .post('/api/assets/upload')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .attach('file', imagePath);
    
    expect(uploadRes.statusCode).toEqual(201);
    expect(uploadRes.body.fileName).toContain('.webp');
    expect(uploadRes.body.fileType).toEqual('image/webp');
  });
});

describe('DNS & SSL Automation', () => {
  const businessId = 'test_biz_123';
  const userId = 'test_user_456';

  it('should verify DNS and initiate SSL provisioning', async () => {
    const res = await request(app)
      .post('/api/website/verify-dns')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send({ siteId: 'site_123', domain: 'valid.com' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('verified');
    expect(res.body.message).toContain('SSL provisioning has been initiated');
  });

  it('should return pending for unresolved DNS records (propagation)', async () => {
    const res = await request(app)
      .post('/api/website/verify-dns')
      .set('x-business-id', businessId)
      .set('x-user-id', userId)
      .send({ siteId: 'site_123', domain: 'invalid.com' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('pending');
  });
});
