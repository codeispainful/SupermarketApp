const fetch = require('node-fetch');
require('dotenv').config();

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_API;

/**async function getAccessToken() {
    console.log('hi from getaccesstoken');
    console.log('PAYPAL_CLIENT:', PAYPAL_CLIENT);
    console.log('PAYPAL_SECRET:', PAYPAL_SECRET);
    console.log('PAYPAL_API:', PAYPAL_API);
    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(PAYPAL_CLIENT + ':' + PAYPAL_SECRET).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    console.log('hi after fetch');
    console.log('PayPal token response status:', response.status);
    const data = await response.json();
    return data.access_token;
}**/

async function getAccessToken() {
    try {
        console.log('hi from getaccesstoken');
        console.log('PAYPAL_CLIENT:', PAYPAL_CLIENT);
        console.log('PAYPAL_SECRET:', PAYPAL_SECRET ? '***' : undefined);
        console.log('PAYPAL_API:', PAYPAL_API);

        const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(PAYPAL_CLIENT + ':' + PAYPAL_SECRET).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        console.log('hi after fetch');
        console.log('Status:', response.status);
        const text = await response.text(); // <--- instead of .json() for now
        console.log('Raw response text:', text);

        // now try parsing
        const data = JSON.parse(text);
        return data.access_token;

    } catch (err) {
        console.error('Error in getAccessToken:', err);
        throw err;
    }
}

async function createOrder(amount) {
    console.log('hi from createOrder');
    const accessToken = await getAccessToken();
    console.log('PayPal access token:', accessToken);
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'SGD',
                    value: amount
                }
            }]
        })
    });
    return await response.json();
}

async function captureOrder(orderId) {
    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data = await response.json();
    console.log('PayPal captureOrder response:', data);
    return data;
}

module.exports = { createOrder, captureOrder };