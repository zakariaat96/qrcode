// Create floating elements on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const floatingElements = document.querySelector('.floating-elements');
    for (let i = 0; i < 15; i++) {
      const element = document.createElement('div');
      element.className = 'floating-element';
      element.style.left = `${Math.random() * 100}%`;
      element.style.top = `${Math.random() * 100}%`;
      element.style.animationDuration = `${Math.random() * 20 + 10}s`;
      element.style.animationDelay = `-${Math.random() * 20}s`;
      floatingElements.appendChild(element);
    }

    // Parallax-like effect for floating elements
    document.addEventListener('mousemove', (e) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      document.querySelectorAll('.floating-element').forEach(element => {
        const speed = Math.random() * 40 + 10;
        element.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
      const content = document.querySelector('.content');
      if(content) {
        content.style.transform = `translate(${x * 20}px, ${y * 20}px) rotateX(${y * 10}deg) rotateY(${-x * 10}deg)`;
      }
    });

    // Simple ripple on all buttons
    document.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', function(e) {
        const x = e.clientX - e.target.offsetLeft;
        const y = e.clientY - e.target.offsetTop;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // On click of start-now, show google login
    const tryBtns = document.querySelectorAll('.cta-button');
    tryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('.google-login-container').style.display = 'block';
      });
    });

    // On click of start-now, show google login
    const startNowBtns = document.querySelectorAll('.start-now-btn');
    startNowBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('.google-login-container').style.display = 'block';
      });
    });

    // On click of demo, go to how-it-works section
    const demoBtns = document.querySelectorAll('.demo-btn');
    demoBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelector('.how-it-works').scrollIntoView({ behavior: 'smooth' });
      });
    });
  });


  document.addEventListener('DOMContentLoaded', () => {
    const pricingLink = document.querySelector('a[href="#pricing"]');

    if (pricingLink) {
        pricingLink.addEventListener('click', (event) => {
            event.preventDefault(); // Empêche le comportement par défaut du lien
            const pricingSection = document.getElementById('pricing');

            if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const contactLink = document.querySelector('a[href="#contact"]');

    if (contactLink ) {
      contactLink .addEventListener('click', (event) => {
            event.preventDefault(); // Empêche le comportement par défaut du lien
            const contactSection = document.getElementById('contact');

            if (contactSection) {
              contactSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
  });


  // Contact form submission
  const contactForm = document.querySelector('form.contact-form');
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
      name: document.querySelector('input[name="name"]').value,
      email: document.querySelector('input[name="email"]').value,
      message: document.querySelector('textarea[name="message"]').value
    };
    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        alert('Message envoyé avec succès !');
        contactForm.reset();
      } else {
        alert(data.errors ? data.errors.join('\n') : data.message);
      }
    } catch (error) {
      alert('Une erreur est survenue lors de l\'envoi du message');
    }
  });

  // Toggle monthly/yearly plan
  const prices = {
  monthly: {
    price: 9.99,
    
  },
  yearly: {
    price: 99.99,
   
  }
  };

  let currentPeriod = 'monthly';

  function togglePeriod(element) {
    currentPeriod = element.dataset.period === 'monthly' ? 'yearly' : 'monthly';
    element.dataset.period = currentPeriod;

    const priceElement = document.getElementById('plan-price');
    const periodElement = document.getElementById('plan-period');

    if (currentPeriod === 'yearly') {
      priceElement.textContent = `€${prices.yearly.price}`;
      periodElement.textContent = 'par année';
    } else {
      priceElement.textContent = `€${prices.monthly.price}`;
      periodElement.textContent = 'par mois';
    }
  }
  

    // Animation du cœur au clic#

    const heartIcon = document.querySelector('.heart-icon');
    if (heartIcon) {
        heartIcon.addEventListener('click', function() {
            this.style.transform = 'scale(1.5)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    }

  

  // Effet de hover sur les éléments
  document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
      mobileMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('active');
      });

      // Fermer le menu si on clique en dehors
      document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !mobileMenuButton.contains(e.target)) {
          mobileMenu.classList.remove('active');
        }
      });

      // Fermer le menu après avoir cliqué sur un lien
      const menuLinks = mobileMenu.getElementsByTagName('a');
      Array.from(menuLinks).forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu.classList.remove('active');
        });
      });
    }


    // Autres event listeners avec vérification d'existence
    const navGroupLinks = document.querySelectorAll('.nav-group a');
    navGroupLinks.forEach(link => {
        link.addEventListener('mouseover', function() {
            this.style.transform = 'translateX(8px)';
        });
        
        link.addEventListener('mouseout', function() {
            this.style.transform = 'translateX(0)';
        });
    });
});
