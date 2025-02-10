const { handler } = require('./get-products');
const fs = require('fs');

// Read credentials from file
const CREDS_PATH = '/mnt/e/selendis/ardent-fusion-174512-0e5c2cfc1974.json';
console.log('Reading credentials from:', CREDS_PATH);

try {
    const credentials = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
    process.env.GOOGLE_CREDENTIALS = Buffer.from(JSON.stringify(credentials)).toString('base64');
    process.env.FOLDER_ID = '1Tbo0fOEn_IUfJZULGJ3hPfWKipytoniJ';
} catch (error) {
    console.error('Failed to read credentials file:', error);
    process.exit(1);
}

// Test the function
async function test() {
    console.time('Total execution');
    try {
        // Mock Netlify Functions event
        const mockEvent = {
            httpMethod: 'GET',
            headers: {
                origin: 'http://localhost:5500'
            }
        };
        
        const result = await handler(mockEvent);
        console.timeEnd('Total execution');
        
        console.log('Status:', result.statusCode);
        
        if (result.statusCode !== 200) {
            console.error('Error response:', result.body);
            return;
        }
        
        const products = JSON.parse(result.body);
        console.log('\nFound products:', products.length);
        
        console.log('\nAll products:');
        products.forEach(product => {
            console.log(`\n${product.title}:`);
            console.log('  Description:', product.description);
            console.log('  Price:', product.price);
            console.log('  Photos:', product.media.length);
            if (product.media.length > 0) {
                console.log('  First photo:', product.media[0]);
            }
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

test(); 