// Simple product page that reads from localStorage
class SimpleProductPage {
    constructor() {
        this.productId = this.getProductIdFromUrl();
        this.currentProduct = null;
        this.cart = null;
        this.init();
    }

    getProductIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    init() {
        if (!this.productId) {
            this.showError('ID-ul produsului lipsește din URL.');
            return;
        }

        this.loadProductFromStorage();
        this.setupEventListeners();
    }

    loadProductFromStorage() {
        try {
            const cachedProducts = localStorage.getItem('selendis_products');
            if (!cachedProducts) {
                this.showError('Nu s-au găsit produsele. Vă rugăm să reveniți la pagina principală.');
                return;
            }

            const products = JSON.parse(cachedProducts);
            console.log('All products from storage:', products);
            console.log('Looking for product ID:', this.productId);
            
            this.currentProduct = products.find(p => p.id === this.productId);
            console.log('Found product:', this.currentProduct);
            
            if (!this.currentProduct) {
                this.showError('Produsul nu a fost găsit.');
                return;
            }

            this.renderProduct();
            this.updateMetaTags();
        } catch (error) {
            console.error('Error loading product from storage:', error);
            this.showError('A apărut o eroare la încărcarea produsului.');
        }
    }

    renderProduct() {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <div class="product-page">
                <div class="breadcrumb">
                    <a href="index.html">Acasă</a> &gt; 
                    <a href="index.html#shop">Produse</a> &gt; 
                    <span>${this.currentProduct.title}</span>
                </div>
                
                <div class="product-container">
                                            <div class="product-gallery">
                            ${this.currentProduct.media && this.currentProduct.media.length > 0 ? `
                                <div class="main-image">
                                    <img src="${this.getImageUrl(this.currentProduct.media[0].id, 'large')}" 
                                         alt="${this.currentProduct.title}" id="mainImage">
                                </div>
                                <div class="thumbnail-gallery">
                                    ${this.currentProduct.media.map((photo, index) => `
                                        <div class="thumbnail ${index === 0 ? 'active' : ''}" 
                                             onclick="productPage.changeMainImage('${this.getImageUrl(photo.id, 'large')}', this)">
                                            <img src="${this.getImageUrl(photo.id, 'small')}" 
                                                 alt="${this.currentProduct.title}">
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="no-image">
                                    <p>Nu sunt imagini disponibile pentru acest produs</p>
                                </div>
                            `}
                        </div>
                    
                    <div class="product-info">
                        <h1 class="product-title">${this.currentProduct.title}</h1>
                        <div class="product-price">
                            <span class="price">${this.currentProduct.price} RON</span>
                        </div>
                        
                        <div class="product-description">
                            <p>${this.currentProduct.description}</p>
                        </div>
                        
                        <div class="product-actions">
                            <button class="add-to-cart-btn" onclick="productPage.addToCart()">
                                Adaugă în coș
                            </button>
                        </div>
                        
                        <div class="social-sharing">
                            <span class="share-label">Distribuie:</span>
                            <div class="social-icons">
                                <a href="#" onclick="productPage.shareOnFacebook(); return false;" class="social-icon facebook" title="Distribuie pe Facebook"></a>
                                <a href="#" onclick="productPage.shareOnInstagram(); return false;" class="social-icon instagram" title="Distribuie pe Instagram"></a>
                                <a href="#" onclick="productPage.shareOnTwitter(); return false;" class="social-icon twitter" title="Distribuie pe Twitter"></a>
                                <a href="#" onclick="productPage.shareOnWhatsApp(); return false;" class="social-icon whatsapp" title="Distribuie pe WhatsApp"></a>
                                <a href="#" onclick="productPage.copyLink(); return false;" class="social-icon copy" title="Copiază link"></a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getImageUrl(imageId, size = 'medium') {
        // Google Drive thumbnail sizes
        const sizes = {
            small: 'w200',
            medium: 'w400',
            large: 'w800'
        };
        
        return `https://drive.google.com/thumbnail?id=${imageId}&sz=${sizes[size]}`;
    }

    changeMainImage(imageUrl, thumbnailElement) {
        document.getElementById('mainImage').src = imageUrl;
        
        // Update active thumbnail
        document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('active'));
        thumbnailElement.classList.add('active');
    }

    updateMetaTags() {
        const currentUrl = window.location.href;
        const firstImage = this.currentProduct.media[0];
        const imageUrl = this.getImageUrl(firstImage.id, 'large');
        
        // Update page title and description
        document.getElementById('pageTitle').textContent = `${this.currentProduct.title} - Selendis`;
        document.getElementById('pageDescription').textContent = this.currentProduct.description;
        
        // Update Open Graph tags
        document.getElementById('ogUrl').content = currentUrl;
        document.getElementById('ogTitle').content = this.currentProduct.title;
        document.getElementById('ogDescription').content = this.currentProduct.description;
        document.getElementById('ogImage').content = imageUrl;
        
        // Update Twitter tags
        document.getElementById('twitterUrl').content = currentUrl;
        document.getElementById('twitterTitle').content = this.currentProduct.title;
        document.getElementById('twitterDescription').content = this.currentProduct.description;
        document.getElementById('twitterImage').content = imageUrl;
        
        // Update product meta
        document.getElementById('productPrice').content = this.currentProduct.price;
        document.getElementById('canonicalUrl').href = currentUrl;
    }

    addToCart() {
        try {
            // Get or create cart instance
            if (!this.cart) {
                // Try to get existing cart from localStorage
                const cartData = localStorage.getItem('cart');
                if (cartData) {
                    this.cart = { items: JSON.parse(cartData) };
                } else {
                    this.cart = { items: [] };
                }
            }
            
            // Check if item already exists
            const existingItem = this.cart.items.find(item => item.id === this.currentProduct.id);
            if (existingItem) {
                this.showNotification('Produsul este deja în coș!', 'info');
                return;
            }
            
            // Add new item with quantity of 1
            this.cart.items.push({
                id: this.currentProduct.id,
                title: this.currentProduct.title,
                price: this.currentProduct.price,
                quantity: 1,
                image: this.currentProduct.media?.[0]?.id
            });
            
            // Save to localStorage
            localStorage.setItem('cart', JSON.stringify(this.cart.items));
            
            // Update cart count
            this.updateCartCount();
            
            // Show success notification
            this.showNotification('Produsul a fost adăugat în coș!', 'success');
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('A apărut o eroare. Vă rugăm încercați din nou.', 'error');
        }
    }

    shareOnFacebook() {
        const url = encodeURIComponent(window.location.href);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    }

    shareOnInstagram() {
        // Instagram doesn't support direct URL sharing, so we'll copy the link and show instructions
        this.showNotification('Pentru Instagram, copiază link-ul și îl poți folosi în story sau post!', 'info');
        this.copyLink();
    }

    shareOnTwitter() {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Verifică acest produs minunat: ${this.currentProduct.title}`);
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    }

    shareOnWhatsApp() {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Verifică acest produs minunat: ${this.currentProduct.title}`);
        window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
    }

    async copyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            this.showNotification('Link-ul a fost copiat!', 'success');
        } catch (error) {
            console.error('Error copying link:', error);
            this.showNotification('Nu s-a putut copia link-ul.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<p>${message}</p>`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    showError(message) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="error-page">
                <h2>Eroare</h2>
                <p>${message}</p>
                <a href="index.html" class="back-home">Înapoi la pagina principală</a>
            </div>
        `;
    }

    setupEventListeners() {
        // No modal events needed for inline social sharing
        
        // Update cart count on page load
        this.updateCartCount();
    }

    updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            // Get cart count from localStorage
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const count = cart.length;
            cartCount.textContent = count || '';
            cartCount.style.display = count ? 'inline' : 'none';
            
            // Also update the cart instance if we have one
            if (this.cart) {
                this.cart.items = cart;
            }
        }
    }
}

// Initialize the product page
const productPage = new SimpleProductPage();

// Make functions globally available for onclick handlers
window.productPage = productPage;
