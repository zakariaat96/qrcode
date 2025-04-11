const nodemailer = require('nodemailer');

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour les autres ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

// Validation des données du formulaire
const validateContactForm = (data) => {
    const errors = [];
    
    if (!data.name || data.name.trim().length < 2) {
        errors.push('Le nom doit contenir au moins 2 caractères');
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Email invalide');
    }
    
    if (!data.message || data.message.trim().length < 10) {
        errors.push('Le message doit contenir au moins 10 caractères');
    }
    
    return errors;
};

// Fonction principale de gestion du contact
const handleContactForm = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        // Valider les données
        const validationErrors = validateContactForm({ name, email, message });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                errors: validationErrors
            });
        }

        // Configuration de l'email
        const mailOptions = {
            from: `"${name}" <${email}>`,
            to: process.env.CONTACT_EMAIL_RECIPIENT,
            subject: 'Nouveau message depuis le formulaire de contact',
            html: `
                <h3>Nouveau message de contact</h3>
                <p><strong>Nom:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        // Envoi de l'email
        await transporter.sendMail(mailOptions);

        // Email de confirmation à l'expéditeur
        const confirmationMailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Confirmation de réception de votre message',
            html: `
                <h3>Merci de nous avoir contacté</h3>
                <p>Cher(e) ${name},</p>
                <p>Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.</p>
                <p>Cordialement,<br>L'équipe QR Chat Assistant</p>
            `
        };

        await transporter.sendMail(confirmationMailOptions);

        // Réponse réussie
        res.status(200).json({
            success: true,
            message: 'Votre message a été envoyé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        res.status(500).json({
            success: false,
            message: 'Une erreur est survenue lors de l\'envoi du message'
        });
    }
};

module.exports = {
    handleContactForm
};