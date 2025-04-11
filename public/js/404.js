// Particle animation
const particlesContainer = document.querySelector('.particles');
const particleCount = 50;

for (let i = 0; i < particleCount; i++) {
    createParticle();
}

function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random size between 2 and 6 pixels
    const size = Math.random() * 4 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random position
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    
    // Animation
    const duration = Math.random() * 3 + 2;
    particle.style.animation = `float ${duration}s ease-in-out infinite`;
    
    particlesContainer.appendChild(particle);
    
    // Remove and recreate particle after animation
    setTimeout(() => {
        particle.remove();
        createParticle();
    }, duration * 1000);
}

// Interactive 404 text
const errorCode = document.getElementById('errorCode');
let rotation = 0;

errorCode.addEventListener('mouseover', () => {
    rotation += 360;
    errorCode.style.transform = `scale(1.05) rotate(${rotation}deg)`;
    errorCode.style.transition = 'transform 0.5s ease';
});

errorCode.addEventListener('mouseout', () => {
    errorCode.style.transform = 'scale(1) rotate(0deg)';
});

// Random glitch effect
setInterval(() => {
    if (Math.random() > 0.9) {
        errorCode.style.textShadow = `
            ${Math.random() * 10 - 5}px ${Math.random() * 10 - 5}px 
            ${Math.random() * 10}px rgba(110, 72, 170, 0.3)
        `;
        setTimeout(() => {
            errorCode.style.textShadow = '2px 2px 10px rgba(110, 72, 170, 0.3)';
        }, 100);
    }
}, 2000);