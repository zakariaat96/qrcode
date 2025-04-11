const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const { pool } = require('../db');
const {recordPayment} = require('../public/utils/paymentUtils.js');

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Error validating webhook signature:', err);
        return res.status(400).send('Webhook signature verification failed.');
    }

    console.log(`Received event: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customerEmail = session.customer_details ? session.customer_details.email : session.customer_email;
        const subscriptionId = session.subscription;

        if (!customerEmail || !subscriptionId) {
            console.error('Missing customer email or subscription ID.');
            return res.json({ received: true });
        }

        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            ///////////////////////////////
            

            const amount = subscription.items.data[0].price.unit_amount / 100;
    
            // Récupérez l'utilisateur pour avoir son ID
            const [userRows] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [customerEmail]
            );
            
            if (userRows.length > 0) {
                await recordPayment(
                    userRows[0].id,
                    amount,
                    'stripe',
                    'completed'
                );
            }

            ///////////////////////////////////

            const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);

            let planType = price.id === process.env.STRIPE_YEARLY_PRICE_ID ? 'yearly' : 'monthly';
            let creditsToAdd = planType === 'yearly' ? 100 : 10;
            let months = planType === 'yearly' ? 12 : 1;

            // Update user in database
            const [rows, fields] = await pool.execute(
                `UPDATE users SET credits = credits + ?, subscription_type = ?, subscription_start = NOW(), subscription_end = DATE_ADD(NOW(), INTERVAL ? MONTH) WHERE email = ?`,
                [creditsToAdd, planType, months, customerEmail]
            );

            console.log('Credits updated for:', customerEmail);
        } catch (error) {
            console.error('Database update error:', error);
        }
    }

    res.json({ received: true });
});

module.exports = router;