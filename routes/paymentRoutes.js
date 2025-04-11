// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 

// Middleware pour vérifier si l'utilisateur est authentifié
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}



router.post('/create-checkout-session', isAuthenticated, async (req, res) => {
  const { planType } = req.body;
  const priceId = planType === 'monthly' ? 'price_mensuel_ID' : 'price_annuel_ID';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/confirmation?plan=${planType}&amount={CHECKOUT_SESSION_AMOUNT}&transaction_id={CHECKOUT_SESSION_ID}&payment_method={CHECKOUT_SESSION_PAYMENT_METHOD}`,
      cancel_url: `${req.protocol}://${req.get('host')}/echec?transaction_id={CHECKOUT_SESSION_ID}&error_code=canceled&payment_method={CHECKOUT_SESSION_PAYMENT_METHOD}`,
      metadata: { planType: planType },
      customer_email: req.user ? req.user.email : null
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erreur lors de la création de la session de paiement Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
