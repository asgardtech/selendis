export class Cart {
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
                media: product.media // Store full media array
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