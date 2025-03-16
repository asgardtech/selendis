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
        this.hamburgerCartIndicator = document.getElementById('hamburgerCartIndicator');
        
        // Initialize navigation
        this.initializeEventListeners();
        
        // Set the default hash to 'shop' if there's no hash
        if (!window.location.hash) {
            window.location.hash = 'shop';
        }
        
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
        
        // Initialize cart indicator
        this.updateCartIndicator();
    }

    initializeEventListeners() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.id.replace('Btn', '');
                
                // Close mobile menu when a link is clicked - ONLY in mobile view
                const navContainer = document.getElementById('navContainer');
                const hamburger = document.getElementById('hamburgerMenu');
                const isMobile = window.innerWidth <= 768;
                
                if (isMobile) {
                    navContainer.classList.remove('active');
                    hamburger.classList.remove('active');
                    
                    // Explicitly set display style to none ONLY for mobile
                    navContainer.style.display = 'none';
                    
                    // Reset hamburger icon when closing menu
                    const spans = hamburger.querySelectorAll('span');
                    spans.forEach(span => {
                        span.style.transform = 'none';
                        span.style.opacity = '1';
                    });
                }
                
                // Scroll to top when clicking navigation links
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                
                // Set the URL fragment
                window.location.hash = page;
            });
        });
        
        // Hamburger menu functionality
        const hamburgerMenu = document.getElementById('hamburgerMenu');
        const navContainer = document.getElementById('navContainer');
        
        if (hamburgerMenu && navContainer) {
            hamburgerMenu.addEventListener('click', (event) => {
                event.stopPropagation(); // Stop event bubbling
                
                hamburgerMenu.classList.toggle('active');
                navContainer.classList.toggle('active');
                
                // Explicitly set display style
                if (navContainer.classList.contains('active')) {
                    navContainer.style.display = 'flex';
                } else {
                    navContainer.style.display = 'none';
                }
                
                // Apply X animation directly to spans
                const spans = hamburgerMenu.querySelectorAll('span');
                if (hamburgerMenu.classList.contains('active')) {
                    spans[0].style.transform = 'translateY(7px) rotate(45deg)';
                    spans[1].style.opacity = '0';
                    spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
                } else {
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (event) => {
                // If menu is active and we're clicking either outside or on a menu item
                if (navContainer.classList.contains('active') && 
                    (!hamburgerMenu.contains(event.target) || event.target.closest('.nav-link'))) {
                    hamburgerMenu.classList.remove('active');
                    navContainer.classList.remove('active');
                    navContainer.style.display = 'none';
                    
                    // Reset hamburger icon
                    const spans = hamburgerMenu.querySelectorAll('span');
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
            });
        }
    }

    handleRoute() {
        const page = window.location.hash.slice(1) || 'shop';
        
        // Scroll to top when route changes
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
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
                this.showHome();
                break;
            default:
                this.showShop(); // Default to shop instead of home
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

            // Add this debug code to ensure products are loaded
            console.log(`Found ${products.length} products`);
            
            // Add a fallback in case productGrid isn't found
            if (!productGrid) {
                console.error("Product grid element not found");
                this.mainContent.innerHTML = '<div class="product-grid" id="productGrid"></div>';
                const retryGrid = document.getElementById('productGrid');
                if (!retryGrid) {
                    throw new Error("Failed to create product grid");
                }
                
                products.forEach(product => {
                    if (product.available !== false) {
                        const productCard = this.productDisplay.createProductCard(product);
                        retryGrid.appendChild(productCard);
                    }
                });
            } else {
                products.forEach(product => {
                    if (product.available !== false) {
                        const productCard = this.productDisplay.createProductCard(product);
                        productGrid.appendChild(productCard);
                    }
                });
            }
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
                <p>Suntem o mică afacere pasionată de frumusețea naturii și de arta meșteșugului, specializată în crearea de bijuterii, accesorii și decorațiuni din flori naturale și rășină. Majoritatea florilor pe care le folosim sunt culese cu grijă din mediul natural, oferindu-le o autenticitate aparte. Folosim tehnici tradiționale de presare a florilor, dar și metode moderne de uscare cu gel desicant, pentru a păstra delicatețea și formele originale ale acestora.</p>
                
                <p>Ceea ce ne face unici este respectul pentru naturalețea florilor. Nu vopsim florile, ci le lăsăm să își conserve culorile, chiar dacă nu rămân exacte după uscare, fiecare detaliu fiind o mărturie a trecerii timpului. Toate produsele noastre sunt realizate cu accesorii din oțel inoxidabil de înaltă calitate, ceea ce garantează durabilitatea și eleganța acestora.</p>
                
                <p>De asemenea, suntem bucuroși să oferim și produse personalizate, realizate la comandă, pentru a răspunde dorințelor și nevoilor fiecărui client. Fiecare piesă pe care o creăm este unicat și reflectă atenția noastră la detalii și iubirea pentru natură.</p>
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
            
            // Update cart indicator
            this.updateCartIndicator();
            
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
                                    <div class="form-group terms-agreement">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="terms-agreement" name="terms-agreement" required>
                                            <span>Sunt de acord cu <a href="/termeni-si-conditii.html" target="_blank">Termenii și Condițiile</a>, 
                                            <a href="/politica-de-retur.html" target="_blank">Politica de Retur</a> și 
                                            <a href="/politica-de-confidentialitate.html" target="_blank">Politica de Confidențialitate</a>.</span>
                                        </label>
                                    </div>
                                    <div id="recaptcha-container"></div>
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
        
        // Re-render reCAPTCHA if the function exists
        if (typeof window.renderRecaptcha === 'function') {
            // Small delay to ensure the DOM is ready
            setTimeout(() => {
                window.renderRecaptcha();
            }, 100);
        }
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

            // Get reCAPTCHA response
            if (typeof grecaptcha === 'undefined') {
                throw new Error('reCAPTCHA nu s-a încărcat corect. Vă rugăm să reîncărcați pagina.');
            }

            const recaptchaResponse = grecaptcha.getResponse(window.recaptchaWidget);
            if (!recaptchaResponse) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Trimite Comanda';
                throw new Error('Vă rugăm să bifați caseta reCAPTCHA');
            }

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
            const response = await fetch('https://selendis.netlify.app/.netlify/functions/submit-order', {
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
                <button onclick="store.productDisplay.closeModal(); window.location.hash='home';" class="close-button">
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

    // Update the cart indicator on the hamburger menu
    updateCartIndicator() {
        const cartCount = this.cart.getTotalItems();
        const indicator = this.hamburgerCartIndicator;
        
        if (cartCount > 0) {
            indicator.style.display = 'block';
            indicator.innerText = cartCount > 9 ? '9+' : cartCount;
            // Reset animation
            indicator.style.animation = 'none';
            // Trigger reflow
            void indicator.offsetWidth;
            // Re-add animation
            indicator.style.animation = 'pulse 1s ease-in-out';
        } else {
            indicator.style.display = 'none';
        }
        
        // Also update cart count in the navigation
        const cartCountElement = document.getElementById('cartCount');
        if (cartCountElement) {
            cartCountElement.innerText = cartCount;
        }
    }
} 