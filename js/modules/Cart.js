export class Cart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart') || '[]');
        this.updateCartUI();
    }

    addItem(product) {
        // Check if item already exists
        const existingItem = this.items.find(item => item.id === product.id);
        if (existingItem) {
            return; // Don't add if already exists
        }
        
        // Add new item with quantity of 1
        this.items.push({
            id: product.id,
            title: product.title,
            price: product.price,
            quantity: 1,
            image: product.media?.[0]?.id
        });
        
        this.save();
        this.updateCartUI();
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
        this.updateCartUI();
        // Immediately update the cart page
        if (window.location.hash === '#cart') {
            window.store.showCart();
        }
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
        return this.items.reduce((total, item) => total + item.price, 0);
    }

    updateCartUI() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            const totalItems = this.items.length;
            cartCount.textContent = totalItems || '';
            cartCount.style.display = totalItems ? 'inline' : 'none';
        }
    }
} 