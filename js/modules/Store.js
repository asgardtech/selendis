import { Cart } from './Cart.js';
import { ProductDisplay } from './ProductDisplay.js';
import { GDPR } from './GDPR.js';
import { DriveParser } from './DriveParser.js';
import { LoadingScreen } from './LoadingScreen.js';

export class Store {
    constructor() {
        this.mainContent = document.getElementById('mainContent');
        this.cart = new Cart();
        this.productDisplay = new ProductDisplay();
        this.gdpr = new GDPR();
        this.loadingScreen = new LoadingScreen();
        
        // Initialize navigation
        this.initializeEventListeners();
        
        // Handle initial route
        this.handleRoute();
        
        // Listen for URL fragment changes
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
    }

    initializeEventListeners() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.id.replace('Btn', '');
                window.location.hash = page;
            });
        });
    }

    handleRoute() {
        const page = window.location.hash.slice(1) || 'home';
        
        // Update active button state
        document.querySelectorAll('.nav-link').forEach(link => {
            const shouldBeActive = link.id === `${page}Btn`;
            link.classList.toggle('active', shouldBeActive);
        });
        
        // Show appropriate content based on page
        switch(page) {
            case 'shop':
                this.showShop();
                break;
            case 'about':
                this.showAbout();
                break;
            case 'cart':
                this.showCart();
                break;
            case 'home':
            default:
                this.showHome();
                break;
        }
    }

    async showHome() {
        this.mainContent.innerHTML = `
            <div class="home-content">
                <h2>Poartă natura cu tine, într-o formă ce durează o viață!</h2>
                <p>Fie că îți dorești un colier cu flori presate, cercei eleganți sau un inel cu petale fine, 
                bijuteriile noastre sunt mai mult decât accesorii – sunt mici povești despre natură, artă și rafinament.</p>
            </div>
        `;
    }

    async showShop() {
        // Show loading screen first
        this.loadingScreen.show('Se încarcă produsele...');

        try {
            const products = await this.loadProducts();
            
            if (!products || !Array.isArray(products)) {
                throw new Error('Invalid products data');
            }
            
            // Create HTML after we have the data
            this.mainContent.innerHTML = '<div class="product-grid" id="productGrid"></div>';
            const productGrid = document.getElementById('productGrid');
            
            if (!products.length) {
                productGrid.innerHTML = `
                    <div class="no-products">
                        <p>Nu există produse disponibile momentan.</p>
                    </div>
                `;
                return;
            }

            products.forEach(product => {
                if (product.available !== false) {
                    const productCard = this.productDisplay.createProductCard(product);
                    productGrid.appendChild(productCard);
                }
            });
        } catch (error) {
            console.error('Error loading products:', error);
            this.loadingScreen.showError(
                'Eroare la încărcarea produselor. Vă rugăm să încercați mai târziu.',
                'window.store.showShop()'
            );
        }
    }

    showAbout() {
        this.mainContent.innerHTML = `
            <div class="about-content">
                <h2>Despre Selendis</h2>
                <p>La Selendis, creăm bijuterii unice din rășină, fiecare piesă fiind o operă de artă în miniatură.</p>
                <p>Inspirația noastră vine din frumusețea naturii și dorința de a crea piese care să aducă bucurie purtătorilor lor.</p>
            </div>
        `;
    }

    async loadProducts() {
        try {
            return await DriveParser.getAllProducts('https://drive.google.com/drive/folders/1Tbo0fOEn_IUfJZULGJ3hPfWKipytoniJ');
        } catch (error) {
            console.error('Error loading products:', error);
            throw error;
        }
    }

    getProductTitle(id) {
        const titles = {
            'colier': 'Colier Floral din Rășină',
            'cercei': 'Cercei Ocean Wave',
            'inel': 'Inel Galaxy din Rășină'
        };
        return titles[id] || id;
    }

    getProductPrice(id) {
        // Implement the logic to get the price based on the product ID
        // This is a placeholder and should be replaced with the actual implementation
        return 0; // Placeholder return, actual implementation needed
    }

    getProductDescription(id) {
        // Implement the logic to get the description based on the product ID
        // This is a placeholder and should be replaced with the actual implementation
        return ''; // Placeholder return, actual implementation needed
    }

    showCart() {
        const cartItems = this.cart.items;
        
        this.productDisplay.modalContent.innerHTML = `
            <h2 class="modal-title">Coșul tău</h2>
            ${cartItems.length === 0 ? '<p>Coșul este gol</p>' : `
                <div class="cart-items">
                    ${cartItems.map(item => `
                        <div class="cart-item">
                            <img src="${this.productDisplay.getImageUrl(item.media[0].id, 'small')}" alt="${item.title}">
                            <div class="cart-item-details">
                                <h3>${item.title}</h3>
                                <p class="item-price">${item.price}</p>
                                <p>Cantitate: ${item.quantity}</p>
                            </div>
                            <button onclick="store.cart.removeItem('${item.id}')" class="remove-item">×</button>
                        </div>
                    `).join('')}
                </div>
                <div class="cart-total">
                    <h3>Total: ${this.cart.getTotal()} lei</h3>
                </div>
                <form id="orderForm" class="order-form" onsubmit="store.sendOrder(event)">
                    <h3>Detalii comandă</h3>
                    <div class="form-group">
                        <label for="name">Nume complet*</label>
                        <input type="text" id="name" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email*</label>
                        <input type="email" id="email" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Telefon*</label>
                        <input type="tel" id="phone" required>
                    </div>
                    <div class="form-group">
                        <label for="address">Adresa de livrare*</label>
                        <textarea id="address" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="notes">Note suplimentare</label>
                        <textarea id="notes"></textarea>
                    </div>
                    <button type="submit" class="submit-order">
                        Trimite Comanda
                    </button>
                </form>
            `}
        `;

        this.productDisplay.modal.style.display = 'block';
    }

    async sendOrder(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        // Prepare order details
        const orderDetails = {
            customerName: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            notes: formData.get('notes'),
            items: this.cart.items.map(item => ({
                title: item.title,
                price: item.price,
                quantity: item.quantity
            })),
            total: this.cart.getTotal()
        };

        // Create email body
        const emailBody = `
            Comandă nouă de la ${orderDetails.customerName}

            Detalii client:
            Email: ${orderDetails.email}
            Telefon: ${orderDetails.phone}
            Adresa: ${orderDetails.address}
            
            Produse comandate:
            ${orderDetails.items.map(item => 
                `- ${item.title} (${item.quantity}x) - ${item.price}`
            ).join('\n')}

            Total comandă: ${orderDetails.total} lei

            Note: ${orderDetails.notes || 'Nicio notă'}
        `;

        // Open email client
        const mailtoLink = `mailto:contact@selendis.ro?subject=Comandă nouă - ${orderDetails.customerName}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;

        // Clear cart after sending order
        this.cart.clear();
        
        // Show success message
        this.productDisplay.modalContent.innerHTML = `
            <h2 class="modal-title">Mulțumim pentru comandă!</h2>
            <p>Comanda ta a fost trimisă cu succes. Te vom contacta în curând pentru confirmare.</p>
            <button onclick="store.productDisplay.closeModal()" class="close-button">
                Închide
            </button>
        `;
    }

    addToCart(productId) {
        const product = this.findProduct(productId);
        if (product) {
            this.cart.addItem(product);
        }
    }
} 