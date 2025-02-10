export class ProductDisplay {
    constructor() {
        this.modal = document.getElementById('itemModal');
        this.modalContent = document.getElementById('modalContent');
    }

    createProductCard(product) {
        const div = document.createElement('div');
        div.className = 'product-card';
        
        div.innerHTML = `
            <img src="${product.media[0]}" alt="${product.title}">
            <h3>${product.title}</h3>
            <p class="price">${product.price}</p>
        `;
        
        div.addEventListener('click', () => this.showProductDetails(product));
        return div;
    }

    showProductDetails(product) {
        const mediaHtml = `
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
                        return `<img src="${media}" alt="${product.title}">`;
                    }
                }).join('')}
            </div>
        `;

        this.modalContent.innerHTML = `
            <h2 class="modal-title">${product.title}</h2>
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