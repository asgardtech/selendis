export class ProductDisplay {
    constructor() {
        this.modal = document.getElementById('itemModal');
        this.modalContent = document.getElementById('modalContent');
        
        // Add ESC key listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    normalizeTitle(title) {
        return title.toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    createProductCard(product) {
        const div = document.createElement('div');
        div.className = 'product-card';
        
        const imageUrl = product.media && product.media.length > 0 ? 
            product.media[0].medium : 
            'images/placeholder.svg';
        
        div.innerHTML = `
            <img src="${imageUrl}" alt="${product.title}">
            <h3>${this.normalizeTitle(product.title)}</h3>
            <p class="price">${product.price}</p>
        `;
        
        div.addEventListener('click', () => this.showProductDetails(product));
        return div;
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showProductDetails(product) {
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';

        const mediaHtml = product.media && product.media.length > 0 ? `
            <div class="product-images">
                ${product.media.map(media => 
                    `<img src="${media.large}" alt="${product.title}">`
                ).join('')}
            </div>
        ` : '';

        this.modalContent.innerHTML = `
            <h2 class="modal-title">${this.normalizeTitle(product.title)}</h2>
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
} 