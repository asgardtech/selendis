import { Cart } from './Cart.js';
import { ProductDisplay } from './ProductDisplay.js';
import { GDPR } from './GDPR.js';
import { DriveParser } from './DriveParser.js';

export class Store {
    constructor() {
        this.mainContent = document.getElementById('mainContent');
        this.cart = new Cart();
        this.productDisplay = new ProductDisplay();
        this.gdpr = new GDPR();
        this.initializeEventListeners();
        
        // Show the correct page based on URL hash
        this.handleRoute();
        this.showGDPRBanner();
    }

    initializeEventListeners() {
        // Update navigation to change URL hash
        document.getElementById('homeBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigate('home');
        });
        document.getElementById('shopBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigate('shop');
        });
        document.getElementById('aboutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigate('about');
        });
        document.getElementById('cartBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showCart();
        });

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());

        document.querySelector('.close').addEventListener('click', () => {
            this.productDisplay.modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === this.productDisplay.modal) {
                this.productDisplay.modal.style.display = 'none';
            }
        });
    }

    navigate(page) {
        window.location.hash = page;
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        
        switch(hash) {
            case 'shop':
                this.showShop();
                break;
            case 'about':
                this.showAbout();
                break;
            case 'home':
            default:
                this.showHome();
                break;
        }
    }

    async showHome() {
        this.setActiveButton('homeBtn');
        this.mainContent.innerHTML = `
            <div class="home-content">
                <h2>Poartă natura cu tine, într-o formă ce durează o viață!</h2>
                <p>Fie că îți dorești un colier cu flori presate, cercei eleganți sau un inel cu petale fine, 
                bijuteriile noastre sunt mai mult decât accesorii – sunt mici povești despre natură, artă și rafinament.</p>
            </div>
        `;
    }

    async showShop() {
        this.setActiveButton('shopBtn');
        
        try {
            const products = await this.loadProducts();
            
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
            console.error('Error:', error);
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
            <div class="about-content">
                <h2>Despre Selendis</h2>
                <p>La Selendis, creăm bijuterii unice din rășină, fiecare piesă fiind o operă de artă în miniatură.</p>
                <p>Inspirația noastră vine din frumusețea naturii și dorința de a crea piese care să aducă bucurie purtătorilor lor.</p>
            </div>
        `;
    }

    setActiveButton(buttonId) {
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.getElementById(buttonId).classList.add('active');
    }

    async loadProducts() {
        try {
            return await DriveParser.getAllProducts('https://drive.google.com/drive/folders/1Tbo0fOEn_IUfJZULGJ3hPfWKipytoniJ');
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
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
        this.productDisplay.modalContent.innerHTML = `
            <h2 class="modal-title">Coșul tău</h2>
            ${this.cart.items.length === 0 ? '<p>Coșul este gol</p>' : `
                <div class="cart-items">
                    ${this.cart.items.map(item => `
                        <div class="cart-item">
                            <img src="${item.media[0]}" alt="${item.title}">
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
                    <h3 class="modal-subtitle">Total produse: ${this.cart.getTotal()} lei</h3>
                </div>
                <form id="customerInfo" class="customer-info">
                    <h3 class="modal-subtitle">Informații livrare</h3>
                    <div class="form-group">
                        <label for="email">Email*</label>
                        <input type="email" id="email" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Telefon*</label>
                        <input type="tel" id="phone" required>
                    </div>
                    <div class="shipping-options">
                        <label for="shipping">Metodă de livrare*</label>
                        <select id="shipping" class="shipping-select" required>
                            <option value="">Selectează metoda de livrare</option>
                            <option value="fan_courier">Fan Courier - 15 lei (1-2 zile)</option>
                            <option value="cargus">Cargus - 16 lei (1-2 zile)</option>
                            <option value="posta">Poșta Română - 12 lei (3-5 zile)</option>
                        </select>
                    </div>
                </form>
                <div class="final-total">
                    <h3 class="modal-subtitle">Total comandă: <span id="finalTotal">${this.cart.getTotal()} lei</span></h3>
                    <p class="shipping-note">(Se va adăuga costul livrării)</p>
                </div>
                <button class="payment-button" onclick="store.checkout()">
                    Finalizează Comanda
                </button>
            `}
        `;

        const shippingSelect = document.getElementById('shipping');
        if (shippingSelect) {
            shippingSelect.addEventListener('change', () => this.updateTotalWithShipping());
        }

        this.productDisplay.modal.style.display = 'block';
    }

    updateTotalWithShipping() {
        const shippingSelect = document.getElementById('shipping');
        const finalTotalElement = document.getElementById('finalTotal');
        const shippingCosts = {
            fan_courier: 15,
            cargus: 16,
            posta: 12
        };

        const subtotal = this.cart.getTotal();
        const shippingCost = shippingSelect.value ? shippingCosts[shippingSelect.value] : 0;
        const total = subtotal + shippingCost;

        finalTotalElement.textContent = `${total} lei`;
    }

    async checkout() {
        const form = document.getElementById('customerInfo');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const shippingMethod = document.getElementById('shipping').value;
        const total = this.cart.getTotal() + this.getShippingCost(shippingMethod);
        const orderId = `ORD-${Date.now()}`;

        try {
            await emailjs.send(
                'YOUR_SERVICE_ID',
                'YOUR_TEMPLATE_ID',
                {
                    to_email: 'oana@asgardtech.io',
                    from_name: 'Selendis Shop',
                    order_id: orderId,
                    customer_email: email,
                    customer_phone: phone,
                    shipping_method: shippingMethod,
                    total: `${total} lei`,
                    items: this.cart.items.map(item => 
                        `${item.title} (${item.quantity}x)`).join('\n'),
                    order_details: JSON.stringify({
                        orderId,
                        customer: { email, phone },
                        shipping: shippingMethod,
                        items: this.cart.items,
                        total
                    }, null, 2)
                }
            );

            this.cart.clear();
            this.productDisplay.modal.style.display = 'none';
            alert('Comanda a fost plasată cu succes! Veți fi contactat în curând.');

        } catch (error) {
            console.error('Error:', error);
            alert('A apărut o eroare. Vă rugăm încercați din nou.');
        }
    }

    getShippingCost(method) {
        const costs = {
            fan_courier: 15,
            cargus: 16,
            posta: 12
        };
        return costs[method] || 0;
    }

    showGDPRBanner() {
        // Implementation of showGDPRBanner method
    }

    async addToCart(productId) {
        try {
            const products = await this.loadProducts();
            const product = products.find(p => p.id === productId);
            
            if (!product) {
                throw new Error('Product not found');
            }

            this.cart.addItem(product);
            
            // Show confirmation
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <p>Produsul a fost adăugat în coș!</p>
                <button onclick="store.showCart()">Vezi coșul</button>
                <button class="close-notification" onclick="this.parentElement.remove()">×</button>
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
            
            // Close the product modal
            this.productDisplay.modal.style.display = 'none';
        } catch (error) {
            console.error('Error:', error);
            alert('A apărut o eroare. Vă rugăm încercați din nou.');
        }
    }
} 