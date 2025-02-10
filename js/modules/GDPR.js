export class GDPR {
    static COOKIE_NAME = 'gdpr_accepted';
    static COOKIE_DURATION = 365; // days

    static acceptCookies() {
        const date = new Date();
        date.setTime(date.getTime() + (this.COOKIE_DURATION * 24 * 60 * 60 * 1000));
        document.cookie = `${this.COOKIE_NAME}=true; expires=${date.toUTCString()}; path=/`;
        
        // Hide the banner
        const banner = document.getElementById('gdpr-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }

    static hasAcceptedCookies() {
        return document.cookie.split(';').some(item => item.trim().startsWith(`${this.COOKIE_NAME}=`));
    }

    static init() {
        const banner = document.getElementById('gdpr-banner');
        if (banner && !this.hasAcceptedCookies()) {
            banner.style.display = 'block';
        }
    }
} 