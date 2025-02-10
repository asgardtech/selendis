import { Store } from './js/modules/Store.js';

document.addEventListener('DOMContentLoaded', () => {
    window.store = new Store();
});

class JewelryStore {
    constructor() {
        this.mainContent = document.getElementById('mainContent');
        this.modal = document.getElementById('itemModal');
        this.modalContent = document.getElementById('modalContent');
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Show home page by default
        this.showHome();
        
        // Show GDPR banner if needed
        this.showGDPRBanner();

        this.cart = new Cart();
        this.reservedItems = this.loadReservedItems();
        this.cleanupReservations();
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
            <div class="home-content">
                <h2>Poartă natura cu tine, într-o formă ce durează o viață!</h2>
                <p>Fie că îți dorești un colier cu flori presate, cercei eleganți sau un inel cu petale fine, 
                bijuteriile noastre sunt mai mult decât accesorii – sunt mici povești despre natură, artă și rafinament.</p>
            </div>
        `;
    }

    async showShop() {
        this.setActiveButton('shopBtn');
        this.mainContent.innerHTML = '<div class="product-grid" id="productGrid"><div class="loading">Se încarcă...</div></div>';
        
        this.loadProducts().then(products => {
            const productGrid = document.getElementById('productGrid');
            
            if (!products.length) {
                productGrid.innerHTML = `
                    <div class="no-products">
                        <p>Nu există produse disponibile momentan.</p>
                    </div>
                `;
                return;
            }

            productGrid.innerHTML = '';
            products.forEach(product => {
                if (product.available !== false) {
                    const productCard = this.createProductCard(product);
                    productGrid.appendChild(productCard);
                }
            });
        }).catch(error => {
            console.error('Error:', error);
            this.mainContent.innerHTML = `
                <div class="error-message">
                    <p>Eroare la încărcarea produselor. Vă rugăm să încercați mai târziu.</p>
                    <button onclick="store.showShop()">Încearcă din nou</button>
                </div>
            `;
        });
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
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.getElementById(buttonId).classList.add('active');
    }

    async loadProducts() {
        try {
            const response = await fetch('stock/index.json');
            if (!response.ok) {
                throw new Error('Could not load product index');
            }
            const data = await response.json();
            return data.products;
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    }

    async findProductMedia(folderPath) {
        const imageTypes = ['jpg', 'jpeg', 'png', 'webp'];
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
                const response = await fetch(`${folderPath}/detail.${type}`);
                if (response.ok) {
                    media.detail = `${folderPath}/detail.${type}`;
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
        
        // Use first media file as main image, fallback to placeholder
        const mainImage = product.media.length > 0 ? product.media[0] : 'placeholder.svg';
        
        div.innerHTML = `
            <img src="${mainImage}" alt="${product.title}" 
                 onerror="this.src='placeholder.svg'">
            <h3>${product.title}</h3>
            <p class="price">${product.price}</p>
        `;
        
        div.addEventListener('click', () => this.showProductDetails(product));
        return div;
    }

    showProductDetails(product) {
        const mediaHtml = product.media.length > 0 ? `
            <div class="product-images">
                ${product.media.map(media => {
                    if (media.endsWith('.mp4')) {
                        return `
                            <video controls>
                                <source src="${media}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        `;
                    } else {
                        return `<img src="${media}" alt="${product.title}" class="detail-image">`;
                    }
                }).join('')}
            </div>
        ` : `
            <div class="product-images">
                <img src="placeholder.svg" alt="${product.title}" class="main-image">
            </div>
        `;

        this.modalContent.innerHTML = `
            <h2>${product.title}</h2>
            ${mediaHtml}
            <div class="product-details">
                <p class="description">${product.description}</p>
                <p class="price">${product.price}</p>
                <div class="buy-section">
                    <button class="add-to-cart-button" onclick="store.addToCart('${product.id}')">
                        Adaugă în coș
                    </button>
                </div>
            </div>
        `;
        this.modal.style.display = 'block';
    }

    async addToCart(productId) {
        try {
            const product = await this.getProductById(productId);
            
            // Check if product is already in someone's cart
            const reservation = this.reservedItems.get(productId);
            if (reservation && Date.now() - reservation.timestamp < 15 * 60 * 1000) {
                alert('Ne pare rău, acest produs este momentan rezervat de altcineva.');
                return;
            }

            // Add reservation
            this.reservedItems.set(productId, {
                timestamp: Date.now()
            });
            this.saveReservedItems();

            // Add to cart
            this.cart.addItem(product, 1);
            
            // Show confirmation
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.innerHTML = `
                <p>Produsul a fost adăugat în coș!</p>
                <p class="reservation-note">Rezervat pentru 15 minute</p>
                <button onclick="store.showCart()">Vezi coșul</button>
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
            
            // Close the product modal
            this.modal.style.display = 'none';
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('A apărut o eroare. Vă rugăm încercați din nou.');
        }
    }

    async getProductById(id) {
        const products = await this.loadProducts();
        return products.find(p => p.id === id);
    }

    // Update the GDPR functions
    showGDPRBanner() {
        if (!localStorage.getItem('cookiesAccepted')) {
            const banner = document.getElementById('gdpr-banner');
            if (banner) {
                banner.classList.add('visible');
            }
        }
    }

    acceptCookies() {
        localStorage.setItem('cookiesAccepted', 'true');
        const banner = document.getElementById('gdpr-banner');
        if (banner) {
            banner.classList.remove('visible');
        }
    }

    showCart() {
        this.modalContent.innerHTML = `
            <h2>Coșul tău</h2>
            ${this.cart.items.length === 0 ? '<p>Coșul este gol</p>' : `
                <div class="cart-items">
                    ${this.cart.items.map(item => `
                        <div class="cart-item">
                            <img src="${item.image}" alt="${item.title}">
                            <div class="cart-item-details">
                                <h3>${item.title}</h3>
                                <p class="item-price">${item.price}</p>
                            </div>
                            <button onclick="store.cart.removeItem('${item.id}')" class="remove-item">×</button>
                        </div>
                    `).join('')}
                </div>
                <div class="cart-total">
                    <h3>Total produse: ${this.cart.getTotal()} lei</h3>
                </div>
                <form id="customerInfo" class="customer-info">
                    <h3>Informații livrare</h3>
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
                    <h3>Total comandă: <span id="finalTotal">${this.cart.getTotal()} lei</span></h3>
                    <p class="shipping-note">(Se va adăuga costul livrării)</p>
                </div>
                <button class="payment-button" onclick="store.checkout()">
                    Finalizează Comanda
                </button>
            `}
        `;

        // Add shipping cost update listener
        const shippingSelect = document.getElementById('shipping');
        if (shippingSelect) {
            shippingSelect.addEventListener('change', () => this.updateTotalWithShipping());
        }

        this.modal.style.display = 'block';
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
            // Send order email using Email.js
            await emailjs.send(
                'YOUR_SERVICE_ID', // Get this from Email.js dashboard
                'YOUR_TEMPLATE_ID', // Get this from Email.js dashboard
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

            // Clear cart and show success
            this.cart.clear();
            this.modal.style.display = 'none';
            alert('Comanda a fost plasată cu succes! Veți fi contactat în curând.');

        } catch (error) {
            console.error('Error:', error);
            alert('A apărut o eroare. Vă rugăm încercați din nou.');
        }
    }

    loadReservedItems() {
        const reserved = localStorage.getItem('reservedItems');
        return reserved ? new Map(JSON.parse(reserved)) : new Map();
    }

    saveReservedItems() {
        localStorage.setItem('reservedItems', 
            JSON.stringify(Array.from(this.reservedItems.entries())));
    }

    cleanupReservations() {
        setInterval(() => {
            let hasChanges = false;
            const now = Date.now();
            
            for (const [itemId, reservation] of this.reservedItems) {
                if (now - reservation.timestamp > 15 * 60 * 1000) {
                    this.reservedItems.delete(itemId);
                    hasChanges = true;
                    
                    // Also remove from cart if it was there
                    if (this.cart.items.find(item => item.id === itemId)) {
                        this.cart.removeItem(itemId);
                    }
                }
            }
            
            if (hasChanges) {
                this.saveReservedItems();
            }
        }, 60000); // Check every minute
    }
}

class Cart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart') || '[]');
    }

    addItem(product, quantity = 1) {
        const existingItem = this.items.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                title: product.title,
                price: product.price,
                quantity,
                image: product.image
            });
        }
        this.save();
        this.updateCartUI();
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
        this.updateCartUI();
    }

    clear() {
        this.items = [];
        this.save();
        this.updateCartUI();
    }

    save() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    }

    getTotal() {
        return this.items.reduce((total, item) => {
            const price = parseInt(item.price.replace(/[^0-9]/g, ''));
            return total + (price * item.quantity);
        }, 0);
    }

    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = this.items.reduce((total, item) => total + item.quantity, 0);
        }
    }
}

// Add back the initialization at the bottom of the file:
document.addEventListener('DOMContentLoaded', () => {
    window.store = new JewelryStore(); // Make store globally accessible
});

// Add this outside the class
function acceptCookies() {
    if (window.store) {
        window.store.acceptCookies();
    }
}