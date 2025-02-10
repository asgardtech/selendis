export class DriveParser {
    static API_KEY = 'YOUR_GOOGLE_API_KEY';
    static FOLDER_ID = '1Tbo0fOEn_IUfJZULGJ3hPfWKipytoniJ';
    static NETLIFY_API = 'https://selendis.netlify.app/.netlify/functions/get-products';

    static extractFolderData(html) {
        try {
            const dataMatch = html.match(/AF_initDataCallback\({.*?data:(.*?),\s*sideChannel:/s);
            if (!dataMatch) return [];

            const jsonData = JSON.parse(dataMatch[1]);
            const foldersData = jsonData[0][2]; // Adjust based on actual structure

            // Group by product type
            const productGroups = foldersData.reduce((groups, folder) => {
                const [id, , name] = folder;
                const type = name.split(' ')[0].toLowerCase(); // brosa, inel, piaptan, pin
                
                if (!groups[type]) groups[type] = [];
                groups[type].push({
                    id,
                    name,
                    folderUrl: `https://drive.google.com/drive/folders/${id}`,
                    type
                });
                
                return groups;
            }, {});

            return productGroups;
        } catch (error) {
            console.error('Error parsing Drive data:', error);
            return {};
        }
    }

    static getProductDetails(type, name) {
        const prices = {
            brosa: 129,
            inel: 89,
            piaptan: 169,
            pin: 99
        };

        const titles = {
            brosa: 'Broșă',
            inel: 'Inel',
            piaptan: 'Piaptăn',
            pin: 'Pin'
        };

        // Get the specific name (e.g., "orhidee", "violeta", etc.)
        const specificName = name.replace(type, '').trim();
        
        return {
            price: `${prices[type]} lei`,
            title: `${titles[type]} ${specificName}`,
            description: `Bijuterie handmade din rășină cu ${specificName}`
        };
    }

    static async getAllProducts() {
        try {
            const response = await fetch(this.NETLIFY_API);
            if (!response.ok) {
                console.error('API Error:', response.status, response.statusText);
                throw new Error('Failed to fetch products');
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                console.error('Invalid data format:', data);
                throw new Error('Invalid products data');
            }

            return data;
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    static async getProductData(folderId, folderName) {
        try {
            // Get all files in the product folder
            const files = await this.listFiles(`'${folderId}' in parents`);
            
            const photos = [];
            let description = '';
            let price = '';

            for (const file of files) {
                if (file.name === 'DESCRIPTION.txt') {
                    description = await this.getFileContent(file.id);
                }
                else if (file.name === 'price.txt') {
                    price = await this.getFileContent(file.id);
                }
                else if (file.mimeType.startsWith('image/')) {
                    photos.push(`https://drive.google.com/uc?export=view&id=${file.id}`);
                }
            }

            return {
                media: photos,
                description: description || `Bijuterie handmade din rășină`,
                price: (price || '99') + ' lei'
            };
        } catch (error) {
            console.error('Error getting product data:', error);
            return null;
        }
    }

    static async listFiles(q) {
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${this.API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to list files');
        const data = await response.json();
        return data.files;
    }

    static async getFileContent(fileId) {
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${this.API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to get file content');
        return response.text();
    }

    static normalizeProductName(name) {
        const parts = name.toLowerCase().split(' ');
        return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
} 