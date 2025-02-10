const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': 'https://selendis.ro',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

async function verifyRecaptcha(token) {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secret}&response=${token}`
    });

    const result = await response.json();
    console.log('reCAPTCHA response:', result);
    
    if (!result.success) {
        throw new Error('Invalid reCAPTCHA token');
    }
    
    // For v2 Checkbox, we only need to check success
    return result.success;
}

async function sendOrderEmails(order) {
    // Email to store owner
    const storeEmail = {
        to: 'oana@asgardtech.io',
        from: 'comenzi@selendis.ro',
        subject: `Comandă nouă de la ${order.customerName}`,
        text: `
            Comandă nouă:
            
            Client: ${order.customerName}
            Email: ${order.email}
            Telefon: ${order.phone}
            Adresa: ${order.address}
            
            Produse:
            ${order.items.map(item => 
                `- ${item.title} (${item.quantity}x) - ${item.price} Lei`
            ).join('\n')}
            
            Total: ${order.total} Lei
            
            Note: ${order.notes || 'Nicio notă'}
        `
    };

    // Email to customer
    const customerEmail = {
        to: order.email,
        from: 'comenzi@selendis.ro',
        subject: 'Confirmare comandă Selendis',
        text: `
            Dragă ${order.customerName},
            
            Îți mulțumim pentru comandă! Am primit cu succes comanda ta și o vom procesa în curând.
            
            Detalii comandă:
            ${order.items.map(item => 
                `- ${item.title} (${item.quantity}x) - ${item.price} Lei`
            ).join('\n')}
            
            Total: ${order.total} Lei
            
            Te vom contacta în curând pentru confirmarea și procesarea comenzii.
            
            Cu drag,
            Echipa Selendis
        `
    };

    await Promise.all([
        sgMail.send(storeEmail),
        sgMail.send(customerEmail)
    ]);
}

exports.handler = async function(event, context) {
    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    try {
        const data = JSON.parse(event.body);
        
        // Verify reCAPTCHA
        try {
            const isValid = await verifyRecaptcha(data.recaptchaResponse);
            if (!isValid) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: 'reCAPTCHA verification failed - risk score too low' })
                };
            }
        } catch (recaptchaError) {
            console.error('reCAPTCHA verification error:', recaptchaError);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'reCAPTCHA verification failed' })
            };
        }

        // Send confirmation emails
        await sendOrderEmails(data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Order received successfully' })
        };
    } catch (error) {
        console.error('Error processing order:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Error processing order' })
        };
    }
}; 