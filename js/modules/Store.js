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
        this._products = null;
        
        // Initialize navigation
        this.initializeEventListeners();
        
        // Handle initial route
        this.handleRoute();
        
        // Listen for URL fragment changes
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });

        // Load products immediately
        this.loadProducts().then(products => {
            this._products = products;
        }).catch(error => {
            console.error('Error preloading products:', error);
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
            // Use cached products if available
            const products = this._products || await this.loadProducts();
            if (!this._products) {
                this._products = products;
            }
            
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

    async findProduct(productId) {
        // Use cached products if available
        if (!this._products) {
            this._products = await this.loadProducts();
        }
        return this._products.find(p => p.id === productId);
    }

    async addToCart(productId) {
        try {
            // Close the modal immediately
            this.productDisplay.closeModal();
            
            const product = await this.findProduct(productId);
            if (!product) {
                throw new Error('Product not found');
            }
            
            this.cart.addItem(product);
            
            // Show notification
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <p>Produsul a fost adăugat în coș!</p>
                <button onclick="store.showCart()">Vezi coșul</button>
            `;
            document.body.appendChild(notification);
            
            // Remove notification after 3 seconds
            setTimeout(() => notification.remove(), 3000);
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('A apărut o eroare. Vă rugăm încercați din nou.');
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
        this.mainContent.innerHTML = `
            <div class="cart-page">
                <h2>Coșul tău</h2>
                ${this.cart.items.length === 0 ? 
                    `<div class="empty-cart">
                        <p>Coșul tău este gol</p>
                        <button onclick="window.location.hash='shop'" class="continue-shopping">
                            Continuă cumpărăturile
                        </button>
                    </div>` : 
                    `<div class="cart-layout">
                        <div class="cart-items-column">
                            <div class="cart-items">
                                ${this.cart.items.map(item => `
                                    <div class="cart-item">
                                        <img src="${this.productDisplay.getImageUrl(item.image, 'small')}" 
                                             alt="${item.title}">
                                        <div class="cart-item-details">
                                            <h3>${item.title}</h3>
                                            <p class="price">${item.price} Lei</p>
                                            <div class="quantity-controls">
                                                <button onclick="store.cart.removeItem('${item.id}')">Șterge</button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="cart-total">
                                <h3>Total: ${this.cart.getTotal()} Lei</h3>
                            </div>
                        </div>
                        <div class="cart-form-column">
                            <div class="cart-summary">
                                <form id="orderForm" class="order-form" onsubmit="store.sendOrder(event)">
                                    <h3>Detalii comandă</h3>
                                    <div class="form-group">
                                        <label for="name">Nume complet*</label>
                                        <input type="text" id="name" name="name" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="email">Email*</label>
                                        <input type="email" id="email" name="email" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="phone">Telefon*</label>
                                        <input type="tel" id="phone" name="phone" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="address">Adresa de livrare*</label>
                                        <textarea id="address" name="address" required></textarea>
                                    </div>
                                    <div class="form-group">
                                        <label for="notes">Note suplimentare</label>
                                        <textarea id="notes" name="notes"></textarea>
                                    </div>
                                    <button type="submit" class="submit-order">
                                        Trimite Comanda
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>`
                }
            </div>
        `;
    }

    async sendOrder(event) {
        event.preventDefault();
        console.log('Form submission started');
        
        const form = event.target;
        const formData = new FormData(form);

        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = 'Se trimite...';

            // Execute reCAPTCHA v3 Enterprise
            console.log('Waiting for reCAPTCHA...');
            await new Promise((resolve) => grecaptcha.enterprise.ready(resolve));
            console.log('reCAPTCHA is ready, executing...');
            
            const recaptchaResponse = await grecaptcha.enterprise.execute('6LdzrtIqAAAAAPKJaPqHIBvuhCQeidklNUnwNweQ', {
                action: 'submit_order'
            });
            console.log('reCAPTCHA token received');

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
                total: this.cart.getTotal(),
                recaptchaResponse
            };

            console.log('Sending order to server...');
            const response = await fetch('/.netlify/functions/submit-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderDetails)
            });

            if (!response.ok) {
                throw new Error('Eroare la trimiterea comenzii');
            }

            console.log('Order sent successfully');
            // Clear cart after successful order
            this.cart.clear();
            
            // Show success message
            this.productDisplay.modalContent.innerHTML = `
                <h2 class="modal-title">Mulțumim pentru comandă!</h2>
                <p>Comanda ta a fost trimisă cu succes. Te vom contacta în curând pentru confirmare.</p>
                <button onclick="store.productDisplay.closeModal()" class="close-button">
                    Închide
                </button>
            `;
            this.productDisplay.modal.style.display = 'block';
        } catch (error) {
            console.error('Error during form submission:', error);
            console.error('Error stack:', error.stack);
            alert(error.message || 'A apărut o eroare la trimiterea comenzii. Vă rugăm să încercați din nou.');
        } finally {
            // Reset form state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Trimite Comanda';
        }
    }
} 