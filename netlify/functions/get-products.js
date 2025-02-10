const { google } = require('googleapis');

exports.handler = async function(event, context) {
  try {
    // Parse the credentials JSON from env variable
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    
    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    // Initialize Drive client
    const drive = google.drive({ version: 'v3', auth });
    
    // Get all product folders
    console.log('Fetching folders from:', process.env.FOLDER_ID);
    const folders = await drive.files.list({
      q: `'${process.env.FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)'
    });

    console.log('Found product folders:', folders.data.files);

    // Get contents of each folder
    const products = await Promise.all(folders.data.files.map(async folder => {
      console.log('Processing product folder:', folder.name);
      
      // Get subfolders (photos, description, price)
      const subfolders = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      let photos = [];
      let description = '';
      let price = '';

      // Process each subfolder
      for (const subfolder of subfolders.data.files) {
        if (subfolder.name === 'photos') {
          // Get photos from the photos folder
          const photoFiles = await drive.files.list({
            q: `'${subfolder.id}' in parents and mimeType contains 'image/'`,
            fields: 'files(id, name)'
          });
          photos = photoFiles.data.files.map(f => 
            `https://drive.google.com/uc?export=view&id=${f.id}`
          );
          console.log(`Found ${photos.length} photos in ${folder.name}`);
        }
        else if (subfolder.name === 'description') {
          // Get description file
          const descFiles = await drive.files.list({
            q: `'${subfolder.id}' in parents and name='DESCRIPTION.txt'`,
            fields: 'files(id)'
          });
          if (descFiles.data.files.length > 0) {
            const descFile = await drive.files.get({
              fileId: descFiles.data.files[0].id,
              alt: 'media'
            });
            description = descFile.data;
          }
        }
        else if (subfolder.name === 'price') {
          // Get price file
          const priceFiles = await drive.files.list({
            q: `'${subfolder.id}' in parents and name='price.txt'`,
            fields: 'files(id)'
          });
          if (priceFiles.data.files.length > 0) {
            const priceFile = await drive.files.get({
              fileId: priceFiles.data.files[0].id,
              alt: 'media'
            });
            price = priceFile.data;
          }
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

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(products)
    };
  } catch (error) {
    console.error('Detailed error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch products',
        details: error.message 
      })
    };
  }
}; 