const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes a URL and returns simplified HTML for LLM analysis
 * and a list of image URLs for migration.
 */
async function scrapeWebsite(url) {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(html);

    // Remove noisy elements
    $('script, style, noscript, iframe, link, svg, footer, nav, aside').remove();

    // Extract images before cleaning more
    const images = [];
    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, url).href;
          images.push(absoluteUrl);
        } catch (e) {}
      }
    });

    // Simplify the HTML structure
    $('*').each((i, el) => {
      const attributes = el.attribs;
      // Keep only essential attributes
      for (const attr in attributes) {
        if (attr !== 'id' && attr !== 'class') {
          $(el).removeAttr(attr);
        }
      }
    });

    const simplifiedHtml = $('body').html()
      .replace(/\s\s+/g, ' ')
      .trim()
      .substring(0, 8000); // Limit context size

    return {
      simplifiedHtml,
      images: [...new Set(images)].slice(0, 20) // Limit image migration for now
    };
  } catch (error) {
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  }
}

module.exports = { scrapeWebsite };
