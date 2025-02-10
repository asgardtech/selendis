const { google } = require('googleapis');
const { getStore } = require('@netlify/edge-functions');

const CACHE_KEY = 'products';
const CACHE_TTL = 5; // seconds
const REFRESH_THRESHOLD = 3; // seconds before expiry to trigger refresh

const ALLOWED_ORIGINS = [
  'https://selendis.ro',
  'http://selendis.ro',
  'http://localhost:5500' // For development
];

function getCorsHeaders(origin) {
  // Check if origin is allowed
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Max-Age': '86400', // 24 hours
    };
  }
  // Default to no CORS if origin not allowed
  return {};
}

async function fetchProducts(drive) {
  const FOLDER_ID = '1Tbo0fOEn_IUfJZULGJ3hPfWKipytoniJ';
  console.log('Fetching files from:', FOLDER_ID);
  
  // First get all product folders
  const folders = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1000,
    orderBy: 'name'
  });

  console.log(`Found ${folders.data.files.length} product folders`);

  // Then get contents for each folder
  const products = await Promise.all(folders.data.files.map(async folder => {
    console.log('Processing folder:', folder.name);
    
    // Get all files in this product folder
    const files = await drive.files.list({
      q: `'${folder.id}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 1000
    });

    const subfolders = files.data.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    let photos = [];
    let description = '';
    let price = '';

    // Process each subfolder
    for (const subfolder of subfolders) {
      const subfiles = await drive.files.list({
        q: `'${subfolder.id}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
        pageSize: 1000
      });

      if (subfolder.name === 'photos') {
        photos = subfiles.data.files
          .filter(f => f.mimeType.startsWith('image/'))
          .map(f => `https://drive.google.com/uc?export=view&id=${f.id}`);
        console.log(`Found ${photos.length} photos in ${folder.name}`);
      }
      else if (subfolder.name === 'description' && subfiles.data.files.length > 0) {
        const descFile = subfiles.data.files[0];
        const descContent = await drive.files.get({
          fileId: descFile.id,
          alt: 'media'
        });
        description = descContent.data;
      }
      else if (subfolder.name === 'price' && subfiles.data.files.length > 0) {
        const priceFile = subfiles.data.files[0];
        const priceContent = await drive.files.get({
          fileId: priceFile.id,
          alt: 'media'
        });
        price = priceContent.data;
      }
    }

    return {
      id: folder.id,
      title: folder.name,
      description: description || 'Bijuterie handmade din rășină',
      price: (price || '99') + ' lei',
      media: photos
    };
  }));

  return products;
}

async function refreshCache(store, drive) {
  try {
    const products = await fetchProducts(drive);
    const etag = Math.random().toString(36).substring(7);
    const lastModified = new Date().toUTCString();
    const timestamp = Date.now();

    await store.set(CACHE_KEY, {
      data: JSON.stringify(products),
      etag,
      lastModified,
      timestamp
    }, { ttl: CACHE_TTL });

    return { products, etag, lastModified };
  } catch (error) {
    console.error('Cache refresh failed:', error);
    return null;
  }
}

exports.handler = async function(event, context) {
  try {
    const store = getStore();
    const corsHeaders = getCorsHeaders(event.headers.origin);
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: corsHeaders
      };
    }

    // Try to get cached data
    const cached = await store.get(CACHE_KEY);
    
    // Initialize Drive client (we might need it)
    const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString();
    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });
    const drive = google.drive({ version: 'v3', auth });

    if (cached) {
      // Check if we should trigger a background refresh
      const age = Date.now() - cached.timestamp;
      const shouldRefresh = age > (CACHE_TTL - REFRESH_THRESHOLD) * 1000;
      
      if (shouldRefresh) {
        // Trigger refresh without waiting
        refreshCache(store, drive).catch(err => 
          console.error('Background refresh failed:', err)
        );
      }

      // Return cached data immediately
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': `public, max-age=${CACHE_TTL}`,
          'ETag': `"${cached.etag}"`,
          'Last-Modified': cached.lastModified,
          'X-Cache': 'HIT',
          'X-Cache-Age': `${age}ms`
        },
        body: cached.data
      };
    }

    // No cache, fetch fresh data
    const fresh = await refreshCache(store, drive);
    if (!fresh) {
      throw new Error('Failed to fetch products');
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'ETag': `"${fresh.etag}"`,
        'Last-Modified': fresh.lastModified,
        'X-Cache': 'MISS'
      },
      body: JSON.stringify(fresh.products)
    };

  } catch (error) {
    console.error('Handler error:', error);
    
    // If we have stale cache, return it
    try {
      const staleCache = await store.get(CACHE_KEY);
      if (staleCache) {
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, max-age=0',
            'ETag': `"${staleCache.etag}"`,
            'Last-Modified': staleCache.lastModified,
            'X-Cache': 'STALE'
          },
          body: staleCache.data
        };
      }
    } catch (cacheError) {
      console.error('Stale cache retrieval failed:', cacheError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch products',
        details: error.message 
      })
    };
  }
}; 