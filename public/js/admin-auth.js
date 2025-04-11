 // Fonction pour basculer entre les formulaires
 function toggleForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
    // Réinitialiser les messages
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('success-message').style.display = 'none';
}

// Gestionnaire pour le formulaire de connexion
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/hidden-admin-orbicall/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            window.location.href = '/hidden-admin-orbicall/dashboard';
        } else {
            const errorDiv = document.getElementById('error-message');
            errorDiv.textContent = data.error || 'Erreur de connexion';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = 'Erreur de connexion au serveur';
        errorDiv.style.display = 'block';
    }
});

// Gestionnaire pour le formulaire d'inscription
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/api/hidden-admin-orbicall/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            const successDiv = document.getElementById('success-message');
            successDiv.textContent = 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.';
            successDiv.style.display = 'block';
            setTimeout(() => {
                toggleForms();
            }, 2000);
        } else {
            const errorDiv = document.getElementById('error-message');
            errorDiv.textContent = data.error || 'Erreur lors de la création du compte';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = 'Erreur de connexion au serveur';
        errorDiv.style.display = 'block';
    }
});