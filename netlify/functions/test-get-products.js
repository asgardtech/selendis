const { handler } = require('./get-products');
const fs = require('fs');

// Read credentials from your JSON file
const credentials = JSON.parse(
    fs.readFileSync('/mnt/e/selendis/ardent-fusion-174512-0e5c2cfc1974.json', 'utf8')
);

// Mock the Netlify environment
process.env.GOOGLE_CREDENTIALS = JSON.stringify(credentials);
process.env.FOLDER_ID = '1Tbo0fOEn_IUfJZULGJ3hPfWKipytoniJ';

// Test the function
async function test() {
    try {
        const result = await handler();
        console.log('Status:', result.statusCode);
        console.log('Products:', JSON.parse(result.body));
    } catch (error) {
        console.error('Error:', error);
    }
}

test(); 