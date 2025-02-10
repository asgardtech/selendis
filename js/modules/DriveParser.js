export class DriveParser {
    static NETLIFY_API = 'https://selendis.netlify.app/.netlify/functions/get-products';

    static async getAllProducts(folderUrl) {
        try {
            const response = await fetch(this.NETLIFY_API);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            return products;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }
} 