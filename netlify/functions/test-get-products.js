const { handler } = require('./get-products');
const fs = require('fs');

// Read credentials from your JSON file
const credentials = JSON.parse(
    fs.readFileSync('/mnt/e/selendis/ardent-fusion-174512-0e5c2cfc1974.json', 'utf8')
);

// Mock the Netlify environment
process.env.GOOGLE_CREDENTIALS = Buffer.from(JSON.stringify(credentials)).toString('base64');
process.env.FOLDER_ID = '1Tbo0fOEn_IUfJZULGJ3hPfWKipytoniJ';

// Test the function
async function test() {
    console.time('Total execution');
    try {
        const result = await handler();
        console.timeEnd('Total execution');
        
        console.log('Status:', result.statusCode);
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