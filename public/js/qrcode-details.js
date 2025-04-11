const params = new URLSearchParams(window.location.search);
const qrId = params.get('id');

async function loadQRCodeDetails() {
try {
    const response = await fetch(`/hidden-admin-orbicall/qrcodes/${qrId}`);
    const data = await response.json();

    // Mise à jour du numéro de QR Code
    document.getElementById('qr-id').textContent = data.id;

    const container = document.getElementById('details-container');

    // Création de la zone du QR Code
    const qrContainer = document.createElement('div');
    qrContainer.classList.add('qr-container');

    const qrImage = document.createElement('img');
    qrImage.src = data.qr_code_data;
    qrImage.alt = "QR Code";
    qrContainer.appendChild(qrImage);

    container.appendChild(qrContainer);

    // Création de la zone d'information sur la propriété
    const propertyInfo = document.createElement('div');
    propertyInfo.classList.add('property-info');

    const propertyLabel = document.createElement('strong');
    propertyLabel.textContent = "Property Info :";
    propertyInfo.appendChild(propertyLabel);

    // Ajout de la valeur de la propriété
    propertyInfo.appendChild(document.createTextNode(" " + data.property_info));
    propertyInfo.appendChild(document.createElement('br'));

    const createdAtLabel = document.createElement('strong');
    createdAtLabel.textContent = "Created At :";
    propertyInfo.appendChild(createdAtLabel);

    // Ajout de la date de création
    propertyInfo.appendChild(document.createTextNode(" " + data.created_at));

    container.appendChild(propertyInfo);
} catch (error) {
    console.error('Erreur loadQRCodeDetails:', error);
}
}

loadQRCodeDetails();

function goBack() {
window.history.back();
}