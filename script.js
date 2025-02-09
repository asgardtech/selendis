class JewelryStore {
    constructor() {
        this.mainContent = document.getElementById('mainContent');
        this.modal = document.getElementById('itemModal');
        this.modalContent = document.getElementById('modalContent');
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Show home page by default
        this.showHome();
    }

    initializeEventListeners() {
        // Navigation buttons
        document.getElementById('homeBtn').addEventListener('click', () => this.showHome());
        document.getElementById('shopBtn').addEventListener('click', () => this.showShop());
        document.getElementById('aboutBtn').addEventListener('click', () => this.showAbout());

        // Modal close button
        document.querySelector('.close').addEventListener('click', () => {
            this.modal.style.display = 'none';
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.style.display = 'none';
            }
        });
    }

    async showHome() {
        this.setActiveButton('homeBtn');
        this.mainContent.innerHTML = `
            <h2>Bine ați venit la Selendis!</h2>
            <p>Descoperiți colecția noastră unică de bijuterii artizanale din rășină.</p>
            <p>Fiecare piesă este creată manual cu dragoste și atenție la detalii.</p>
        `;
    }

    async showShop() {
        this.setActiveButton('shopBtn');
        this.mainContent.innerHTML = '<div class="product-grid" id="productGrid"><div class="loading">Se încarcă...</div></div>';
        
        try {
            const products = await this.loadProducts();
            const productGrid = document.getElementById('productGrid');
            
            if (products.length === 0) {
                productGrid.innerHTML = '<p>Nu există produse disponibile momentan.</p>';
                return;
            }

            productGrid.innerHTML = '';
            products.forEach(product => {
                const productCard = this.createProductCard(product);
                productGrid.appendChild(productCard);
            });
        } catch (error) {
            console.error('Eroare:', error);
            this.mainContent.innerHTML = `
                <div class="error-message">
                    <p>Eroare la încărcarea produselor. Vă rugăm să încercați mai târziu.</p>
                    <button onclick="store.showShop()">Încearcă din nou</button>
                </div>
            `;
        }
    }

    showAbout() {
        this.setActiveButton('aboutBtn');
        this.mainContent.innerHTML = `
            <h2>Despre Selendis</h2>
            <p>La Selendis, creăm bijuterii unice din rășină, fiecare piesă fiind o operă de artă în miniatură.</p>
            <p>Inspirația noastră vine din frumusețea naturii și dorința de a crea piese care să aducă bucurie purtătorilor lor.</p>
        `;
    }

    setActiveButton(buttonId) {
        document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(buttonId).classList.add('active');
    }

    async loadProducts() {
        try {
            const productFolders = ['colier-floral', 'inel-galaxie', 'cercei-ocean'];
            const products = [];

            for (const folder of productFolders) {
                try {
                    const [title, price, description] = await Promise.all([
                        fetch(`/stock/${folder}/title.txt`).then(r => r.text()),
                        fetch(`/stock/${folder}/price.txt`).then(r => r.text()),
                        fetch(`/stock/${folder}/description.txt`).then(r => r.text())
                    ]);

                    const media = await this.findProductMedia(`/stock/${folder}/images`);

                    products.push({
                        id: folder,
                        title: title.trim(),
                        price: price.trim(),
                        description: description.trim(),
                        image: media.main || '/placeholder.svg',
                        detailImage: media.detail || media.main || '/placeholder.svg',
                        video: media.video
                    });
                } catch (error) {
                    console.error(`Error loading product ${folder}:`, error);
                }
            }

            return products;
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    }

    async findProductMedia(folderPath) {
        const imageTypes = ['svg', 'webp', 'jpg', 'jpeg', 'png'];
        const videoTypes = ['mp4', 'webm'];
        const media = {
            main: null,
            detail: null,
            video: null
        };

        // Try to find main image
        for (const type of imageTypes) {
            try {
                const response = await fetch(`${folderPath}/main.${type}`);
                if (response.ok) {
                    media.main = `${folderPath}/main.${type}`;
                    break;
                }
            } catch (error) {
                continue;
            }
        }

        // Try to find detail image
        for (const type of imageTypes) {
            try {
                const response = await fetch(`${folderPath}/detail1.${type}`);
                if (response.ok) {
                    media.detail = `${folderPath}/detail1.${type}`;
                    break;
                }
            } catch (error) {
                continue;
            }
        }

        // Try to find video
        for (const type of videoTypes) {
            try {
                const response = await fetch(`${folderPath}/video.${type}`);
                if (response.ok) {
                    media.video = `${folderPath}/video.${type}`;
                    break;
                }
            } catch (error) {
                continue;
            }
        }

        return media;
    }

    createProductCard(product) {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="${product.image}" alt="${product.title}" 
                 onerror="this.src='https://via.placeholder.com/400x400?text=Imagine+Indisponibilă'">
            <h3>${product.title}</h3>
            <p class="price">${product.price}</p>
        `;
        
        div.addEventListener('click', () => this.showProductDetails(product));
        return div;
    }

    showProductDetails(product) {
        const mediaHtml = `
            <div class="product-images">
                <img src="${product.image}" alt="${product.title}" class="main-image"
                     onerror="this.src='/placeholder.svg'">
                ${product.detailImage ? `
                    <img src="${product.detailImage}" alt="${product.title} - Detaliu" class="detail-image"
                         onerror="this.src='/placeholder.svg'">
                ` : ''}
            </div>
        `;

        const shippingHtml = `
            <div class="shipping-options">
                <h3>Livrare</h3>
                <select id="shipping" class="shipping-select">
                    <option value="fan_courier">Fan Courier - 15 lei (1-2 zile)</option>
                    <option value="cargus">Cargus - 16 lei (1-2 zile)</option>
                    <option value="posta">Poșta Română - 12 lei (3-5 zile)</option>
                </select>
            </div>
        `;

        this.modalContent.innerHTML = `
            <h2>${product.title}</h2>
            ${mediaHtml}
            <div class="product-details">
                <p class="description">${product.description}</p>
                <p class="price">${product.price}</p>
                <div class="buy-section">
                    ${shippingHtml}
                    <button class="payment-button" onclick="store.initiatePayment('${product.id}')">
                        Cumpără Acum
                    </button>
                </div>
            </div>
        `;
        this.modal.style.display = 'block';
    }

    async initiatePayment(productId) {
        const shippingMethod = document.getElementById('shipping').value;
        const product = await this.getProductById(productId);
        
        try {
            // Create order in your system first
            const orderResponse = await fetch('/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productId,
                    shippingMethod,
                    amount: this.calculateTotal(product.price, shippingMethod)
                })
            });
            
            const { orderId } = await orderResponse.json();
            
            // Initialize Netopia payment
            const paymentResponse = await fetch('/api/init-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId,
                    amount: this.calculateTotal(product.price, shippingMethod),
                    shipping: {
                        method: shippingMethod,
                        address: null // Will be collected by Netopia
                    }
                })
            });
            
            const { paymentUrl } = await paymentResponse.json();
            window.location.href = paymentUrl;
            
        } catch (error) {
            console.error('Error:', error);
            alert('A apărut o eroare la procesarea plății. Vă rugăm încercați din nou.');
        }
    }

    calculateTotal(price, shippingMethod) {
        const shippingCosts = {
            fan_courier: 15,
            cargus: 16,
            posta: 12
        };
        
        const basePrice = parseInt(price.replace(/[^0-9]/g, ''));
        return basePrice + shippingCosts[shippingMethod];
    }

    async getProductById(id) {
        const products = await this.loadProducts();
        return products.find(p => p.id === id);
    }
}

// Add back the initialization at the bottom of the file:
document.addEventListener('DOMContentLoaded', () => {
    window.store = new JewelryStore(); // Make store globally accessible
});