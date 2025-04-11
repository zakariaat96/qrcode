// pricing.js
let prices = {
    monthly: {
        price: 9.99,  // Default value
        link: "https://buy.stripe.com/test_4gw7tJ5G50wcbMk7sx"  
    },
    yearly: {
        price: 99.99,  // Default value
        link: "https://buy.stripe.com/test_00gg0f2tT6UAcQo8wC"  
    }
};

let currentPeriod = 'monthly';

// Initialize with default values first
const priceElement = document.getElementById('plan-price');
const periodElement = document.getElementById('plan-period');
priceElement.textContent = `€${prices.monthly.price}`;
periodElement.textContent = 'per month';

// Then fetch the actual prices
fetch('/api/stripe-links')
    .then(response => response.json())
    .then(data => {
        prices = data;
        // Update display with fetched prices
        updatePriceDisplay();
    })
    .catch(error => {
        console.error('Error fetching prices:', error);
        // En cas d'erreur, on garde les valeurs par défaut
    });

function updatePriceDisplay() {
    const priceElement = document.getElementById('plan-price');
    const periodElement = document.getElementById('plan-period');
    
    const currentPrice = currentPeriod === 'yearly' ? prices.yearly.price : prices.monthly.price;
    const currentPeriodText = currentPeriod === 'yearly' ? 'per year' : 'per month';
    
    priceElement.textContent = `€${currentPrice}`;
    periodElement.textContent = currentPeriodText;
}

function togglePeriod(element) {
    currentPeriod = element.dataset.period === 'monthly' ? 'yearly' : 'monthly';
    element.dataset.period = currentPeriod;
    updatePriceDisplay();
}

document.getElementById('checkout-button').addEventListener('click', () => {
    const stripeLink = currentPeriod === 'yearly' ? prices.yearly.link : prices.monthly.link;
    window.location.href = stripeLink;
});