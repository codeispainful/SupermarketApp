const fetch = require('node-fetch');
require('dotenv').config();
const Orders = require('../models/Orders');
const Transaction = require('../models/Transaction');
const CartController = require('../controllers/CartController');
const paymentNotifier = require('./paymentNotifier');

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

async function verifyWebhook(rawBody, headers) {
    try {
        const accessToken = await getAccessToken();

        const bodyJson = JSON.parse(rawBody);

        const response = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                auth_algo: headers['paypal-auth-algo'],
                cert_url: headers['paypal-cert-url'],
                transmission_id: headers['paypal-transmission-id'],
                transmission_sig: headers['paypal-transmission-sig'],
                transmission_time: headers['paypal-transmission-time'],
                webhook_id: process.env.PAYPAL_WEBHOOK_ID,
                webhook_event: bodyJson
            })
        });

        const data = await response.json();
        return data.verification_status === 'SUCCESS';
    } catch (err) {
        console.error('verifyWebhook error:', err);
        return false;
    }
}

async function getOrder(orderId) {
    const accessToken = await getAccessToken();

    const response = await fetch(
        `${PAYPAL_API}/v2/checkout/orders/${orderId}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    return await response.json();
}

async function handlePaymentCompleted(event) {
    const capture = event.resource;

    const captureId = capture.id;
    const paypalOrderId =
        capture?.supplementary_data?.related_ids?.order_id;

    if (!paypalOrderId) {
        console.error("Missing PayPal order ID");
        return;
    }

    // Prevent double processing using Transaction model
    const exists = await new Promise((resolve) => {
        Transaction.exists(captureId, (err, result) => {
            if (err) {
                console.error('Transaction.exists error:', err);
                return resolve(false);
            }
            return resolve(Boolean(result));
        });
    });
    if (exists) return;

    // 🔥 Fetch full order (THIS is where custom_id lives)
    const order = await getOrder(paypalOrderId);

    const purchaseUnit = order.purchase_units?.[0];

    const userId = purchaseUnit?.custom_id;
    if (!userId) {
        console.error("Missing userId (custom_id) on order");
        return;
    }

    // Finalize checkout
    CartController.finalizeCheckout(userId,captureId, null, null, (err, orderId) => {
        if (err) return console.error(err);

        const details = {
            id: captureId,
            orderId,
            payerId: order.payer?.payer_id,
            payerEmail: order.payer?.email_address,
            amount: capture.amount?.value,
            currency: capture.amount?.currency_code,
            status: capture.status,
            time: capture.create_time
        };

        Transaction.add(details, (err, result) => {
            if (err) {
                console.error('Error creating transaction record:', err);
            } else {
                try {
                    paymentNotifier.notify(captureId, { finalized: true, orderId });
                } catch (e) {
                    console.error('Error notifying listeners:', e);
                }
            }
        });
    });
}

async function handlePaymentRefunded(event) {
    const refund = event.resource;
    const captureId = refund.links
        .find(l => l.rel === 'up')
        ?.href.split('/')
        .pop();

    // Mark transaction refunded
    await Transaction.markRefunded(captureId, refund.id);

    // Mark refund request completed in refunds table if present
    const Refunds = require('../models/Refund');
    await new Promise((resolve) => {
        Refunds.completeByTransaction(captureId, (err) => {
            if (err) console.error('Failed to mark refund completed:', err);
            resolve();
        });
    });

    console.log(`Refund completed for capture ${captureId}, please refresh the admin view`);
}

async function createOrder(amount, userId) {
    console.log("Creating PayPal order for userId:", userId);
    const accessToken = await getAccessToken();

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
                },
                custom_id: userId // store userId for webhook
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

async function refundCapture(captureId) {
    const accessToken = await getAccessToken();

    const response = await fetch(
        `${PAYPAL_API}/v2/payments/captures/${captureId}/refund`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    return await response.json();
}

module.exports = { createOrder, captureOrder, verifyWebhook, handlePaymentCompleted, refundCapture, handlePaymentRefunded};