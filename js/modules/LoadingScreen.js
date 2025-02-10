export class LoadingScreen {
    constructor() {
        this.mainContent = document.getElementById('mainContent');
    }

    show(message = 'Se încarcă...') {
        this.mainContent.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <p>${message}</p>
            </div>
        `;
    }

    hide() {
        // This method is called when content is ready to be displayed
        // The actual hiding is done by replacing the content
    }

    showError(message = 'A apărut o eroare. Vă rugăm să încercați din nou.', retryCallback = null) {
        this.mainContent.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                ${retryCallback ? `<button onclick="${retryCallback}">Încearcă din nou</button>` : ''}
            </div>
        `;
    }
} 