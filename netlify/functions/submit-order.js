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
        text: `Comandă nouă:

Client: ${order.customerName}
Email: ${order.email}
Telefon: ${order.phone}
Adresa: ${order.address}

Produse:
${order.items.map(item => `- ${item.title} (${item.quantity}x) - ${item.price} Lei`).join('\n')}

Total: ${order.total} Lei

Note: ${order.notes || 'Nicio notă'}`,
        html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #9e5e5e; font-size: 24px; margin: 0;">Comandă nouă Selendis</h1>
                </div>
                
                <div style="background-color: #fff9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Detalii Client:</h2>
                    <p style="margin: 5px 0;"><strong>Nume:</strong> ${order.customerName}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${order.email}</p>
                    <p style="margin: 5px 0;"><strong>Telefon:</strong> ${order.phone}</p>
                    <p style="margin: 5px 0;"><strong>Adresa:</strong> ${order.address}</p>
                </div>

                <div style="background-color: #fff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Produse comandate:</h2>
                    ${order.items.map(item => `
                        <div style="border-bottom: 1px solid #f3d7d7; padding: 10px 0;">
                            <p style="margin: 5px 0;">
                                <span style="color: #2c3e50;">${item.title}</span><br>
                                <span style="color: #666;">${item.quantity}x - ${item.price} Lei</span>
                            </p>
                        </div>
                    `).join('')}
                    <div style="margin-top: 15px; text-align: right;">
                        <p style="font-size: 18px; color: #9e5e5e;"><strong>Total: ${order.total} Lei</strong></p>
                    </div>
                </div>

                ${order.notes ? `
                    <div style="background-color: #fff; padding: 20px; border-radius: 10px;">
                        <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Note:</h2>
                        <p style="margin: 5px 0;">${order.notes}</p>
                    </div>
                ` : ''}
            </div>
        `
    };

    // Email to customer
    const customerEmail = {
        to: order.email,
        from: 'comenzi@selendis.ro',
        subject: 'Confirmare comandă Selendis',
        text: `Dragă ${order.customerName},

Îți mulțumim pentru comandă! Am primit cu succes comanda ta și o vom procesa în curând.

Detalii comandă:
${order.items.map(item => `- ${item.title} (${item.quantity}x) - ${item.price} Lei`).join('\n')}

Total: ${order.total} Lei

Te vom contacta în curând pentru confirmarea și procesarea comenzii.

Prin plasarea acestei comenzi, ai fost de acord cu Termenii și Condițiile, Politica de Retur și Politica de Confidențialitate Selendis.

Cu drag,
Echipa Selendis

Urmărește-ne pe social media:
Facebook: https://www.facebook.com/selendishandmadegifts/
Instagram: https://www.instagram.com/selendis_decoratiuni_rasina/`,
        html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #9e5e5e; font-family: 'Georgia', serif; font-size: 28px; margin: 0;">Selendis</h1>
                    <p style="color: #666; font-size: 16px; margin-top: 10px;">Confirmare comandă</p>
                </div>
                
                <div style="background-color: #fff9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="font-size: 16px; line-height: 1.5; color: #2c3e50;">
                        Dragă ${order.customerName},
                    </p>
                    <p style="font-size: 16px; line-height: 1.5; color: #2c3e50;">
                        Îți mulțumim pentru comandă! Am primit cu succes comanda ta și o vom procesa în curând.
                    </p>
                </div>

                <div style="background-color: #fff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0;">Detalii comandă:</h2>
                    ${order.items.map(item => `
                        <div style="border-bottom: 1px solid #f3d7d7; padding: 10px 0;">
                            <p style="margin: 5px 0;">
                                <span style="color: #2c3e50;">${item.title}</span><br>
                                <span style="color: #666;">${item.quantity}x - ${item.price} Lei</span>
                            </p>
                        </div>
                    `).join('')}
                    <div style="margin-top: 15px; text-align: right;">
                        <p style="font-size: 18px; color: #9e5e5e;"><strong>Total: ${order.total} Lei</strong></p>
                    </div>
                </div>

                <div style="background-color: #fff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="font-size: 16px; line-height: 1.5; color: #2c3e50;">
                        Te vom contacta în curând pentru confirmarea și procesarea comenzii.
                    </p>
                </div>

                <div style="background-color: #fff9f9; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <p style="font-size: 14px; line-height: 1.5; color: #666; margin: 0;">
                        Prin plasarea acestei comenzi, ai fost de acord cu Termenii și Condițiile, Politica de Retur și Politica de Confidențialitate Selendis.
                    </p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3d7d7;">
                    <p style="color: #9e5e5e; margin: 0;">Cu drag,</p>
                    <p style="color: #9e5e5e; font-family: 'Georgia', serif; font-size: 18px; margin: 5px 0;">Echipa Selendis</p>
                    <div style="margin-top: 20px;">
                        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Urmărește-ne pe social media:</p>
                        <a href="https://www.facebook.com/selendishandmadegifts/" style="display: inline-block; margin: 0 10px; color: #9e5e5e; text-decoration: none;" target="_blank">Facebook</a>
                        <span style="color: #d4a5a5;">•</span>
                        <a href="https://www.instagram.com/selendis_decoratiuni_rasina/" style="display: inline-block; margin: 0 10px; color: #9e5e5e; text-decoration: none;" target="_blank">Instagram</a>
                    </div>
                </div>
            </div>
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