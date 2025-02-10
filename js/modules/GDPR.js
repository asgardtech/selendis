export class GDPR {
    constructor() {
        this.banner = document.getElementById('gdpr-banner');
        this.checkCookieConsent();
    }

    checkCookieConsent() {
        if (!localStorage.getItem('cookiesAccepted')) {
            this.banner.classList.add('visible');
        }
    }

    acceptCookies() {
        localStorage.setItem('cookiesAccepted', 'true');
        this.banner.classList.remove('visible');
    }
} 