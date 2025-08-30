const { google } = require('googleapis');

// Simple in-memory cache
let cache = {
  data: null,
  etag: null,
  lastModified: null,
  timestamp: null
};

// Cache time-to-live. Keep short – we rely on SWR to keep data fresh.
const CACHE_TTL = 60;            // seconds products are considered "fresh"
const REFRESH_THRESHOLD = 30;    // seconds before expiry to trigger background refresh

// Tracks an inflight cache refresh so we don't start multiple concurrent ones
let refreshInProgress = null;

// Ensure background tasks are properly tracked
process.on('beforeExit', () => {
  if (refreshInProgress) {
    console.log('Function exiting with background refresh in progress');
  }
});

const ALLOWED_ORIGINS = [
  'https://selendis.ro',
  'http://selendis.ro',
  'http://localhost:5500', // For development
  'http://127.0.0.1:5500'  // Add this too for local development
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

    // Get images directly from the product folder
    let photos = files.data.files
      .filter(f => f.mimeType.startsWith('image/'))
      .map(f => ({
        id: f.id,
        name: f.name
      }));

    const subfolders = files.data.files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
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
        // Add photos from the photos subfolder
        const subfolder_photos = subfiles.data.files
          .filter(f => f.mimeType.startsWith('image/'))
          .map(f => ({
            id: f.id,
            name: f.name
          }));
        photos = [...photos, ...subfolder_photos];
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
        // Normalize price: strip everything except numbers
        price = priceContent.data.replace(/[^\d]/g, '');
      }
    }

    console.log(`Found ${photos.length} photos in ${folder.name}`);

    // Extract title from first line of description
    const lines = description.split('\n');
    const title = lines[0] || folder.name;
    const remainingDescription = lines.slice(1).join('\n').trim() || 'Bijuterie handmade din rășină';

    return {
      id: folder.id,
      title: title,
      description: remainingDescription,
      price: parseInt(price || '99', 10), // Convert to number, default to 99 if empty
      media: photos
    };
  }));

  return products;
}

async function refreshCache(drive) {
  try {
    const products = await fetchProducts(drive);
    const etag = Math.random().toString(36).substring(7);
    const lastModified = new Date().toUTCString();
    const timestamp = Date.now();

    cache = {
      data: JSON.stringify(products),
      etag,
      lastModified,
      timestamp
    };

    return { products, etag, lastModified };
  } catch (error) {
    console.error('Cache refresh failed:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

exports.handler = async function(event, context) {
  // Allow the function to return while asynchronous work keeps running
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Handle case when event.headers is undefined (like in test environment)
    const corsHeaders = event?.headers?.origin ? getCorsHeaders(event.headers.origin) : {};
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: corsHeaders
      };
    }

    // Determine cache age and whether it's time to refresh
    const now = Date.now();
    const ageMs = cache.data ? now - cache.timestamp : Infinity;
    const isExpired = ageMs > CACHE_TTL * 1000;
    const needsRefresh = isExpired || ageMs > (CACHE_TTL - REFRESH_THRESHOLD) * 1000;

    // If we have cached data – serve it immediately (even if expired)
    if (cache.data) {
      // Kick off a background refresh if necessary (but do not wait for it)
      if (needsRefresh && !refreshInProgress) {
        console.log('Triggering background refresh…');
        
        // Use a more robust approach that ensures the background task survives
        const backgroundRefresh = async () => {
          try {
            const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString();
            const credentials = JSON.parse(credentialsJson);
            const auth = new google.auth.GoogleAuth({
              credentials,
              scopes: ['https://www.googleapis.com/auth/drive.readonly']
            });
            const drive = google.drive({ version: 'v3', auth });
            await refreshCache(drive);
            console.log('Background refresh complete');
          } catch (err) {
            console.error('Background refresh failed:', err);
          } finally {
            refreshInProgress = null;
          }
        };
        
        // Start the background refresh without awaiting it
        refreshInProgress = backgroundRefresh();
        
        // Add a small delay to ensure the background task starts before we return
        // This helps ensure the task is properly queued in the event loop
        setTimeout(() => {}, 0);
      }

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': `public, max-age=${CACHE_TTL}`,
          'ETag': `"${cache.etag}"`,
          'Last-Modified': cache.lastModified,
          'X-Cache': isExpired ? 'STALE' : 'HIT',
          'X-Cache-Age': `${ageMs}ms`
        },
        body: cache.data
      };
    }

    // No cache yet (cold start) – fetch synchronously this once
    console.log('Cold start – fetching initial product list');
    const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS, 'base64').toString();
    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });
    const drive = google.drive({ version: 'v3', auth });

    const fresh = await refreshCache(drive);
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
    
    // Return stale cache if available
    if (cache.data) {
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=0',
          'ETag': `"${cache.etag}"`,
          'Last-Modified': cache.lastModified,
          'X-Cache': 'STALE'
        },
        body: cache.data
      };
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