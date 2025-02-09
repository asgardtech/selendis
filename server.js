const express = require('express');
const crypto = require('crypto');
const app = express();

const NETOPIA_KEY = process.env.NETOPIA_KEY;
const NETOPIA_SIGNATURE = process.env.NETOPIA_SIGNATURE;
const SITE_URL = 'https://selendis.ro';

app.post('/api/init-payment', async (req, res) => {
    const { orderId, amount, shipping } = req.body;
    
    const paymentData = {
        order: {
            id: orderId,
            amount: amount,
            currency: 'RON',
            details: 'Comandă Selendis'
        },
        url: {
            return: `${SITE_URL}/payment/success`,
            cancel: `${SITE_URL}/payment/cancel`,
            confirm: `${SITE_URL}/api/payment-webhook`
        },
        billing: {
            email: '',  // Will be collected by Netopia
            phone: '',  // Will be collected by Netopia
            firstName: '',
            lastName: '',
            city: '',
            country: 'RO',
            state: '',
            postalCode: '',
            details: ''
        }
    };

    const signature = crypto
        .createHmac('sha256', NETOPIA_SIGNATURE)
        .update(JSON.stringify(paymentData))
        .digest('hex');

    const response = await fetch('https://secure.netopia-payments.com/payment/card', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Payment-Signature': signature,
            'X-Auth-Key': NETOPIA_KEY
        },
        body: JSON.stringify(paymentData)
    });

    const { paymentUrl } = await response.json();
    res.json({ paymentUrl });
});

// Add payment webhook handler
app.post('/api/payment-webhook', async (req, res) => {
    // Verify Netopia signature
    const signature = req.headers['x-payment-signature'];
    const calculatedSignature = crypto
        .createHmac('sha256', NETOPIA_SIGNATURE)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature !== calculatedSignature) {
        return res.status(400).send('Invalid signature');
    }

    const { order, status } = req.body;

    // Handle payment status
    switch (status) {
        case 'confirmed':
            // Payment successful
            // Update order status in your database
            // Send confirmation email
            break;
        case 'pending':
            // Payment pending
            // Update order status
            break;
        case 'cancelled':
            // Payment cancelled
            // Update order status
            break;
        case 'failed':
            // Payment failed
            // Update order status
            // Notify customer
            break;
    }

    res.status(200).send('OK');
});

// Add success and cancel routes
app.get('/payment/success', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Plată Reușită - Selendis</title>
                <meta http-equiv="refresh" content="5;url=${SITE_URL}">
            </head>
            <body>
                <h1>Plata a fost procesată cu succes!</h1>
                <p>Veți fi redirecționat către pagina principală în 5 secunde...</p>
            </body>
        </html>
    `);
});

app.get('/payment/cancel', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Plată Anulată - Selendis</title>
                <meta http-equiv="refresh" content="5;url=${SITE_URL}">
            </head>
            <body>
                <h1>Plata a fost anulată</h1>
                <p>Veți fi redirecționat către pagina principală în 5 secunde...</p>
            </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 