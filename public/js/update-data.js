let qrcodes = [];
let selectedItems = new Set();
let selectedQRCode = null;
let isEditing = false;

// Références DOM
const sourcesList = document.getElementById('sourcesList');
const sidePanel = document.getElementById('sidePanel');
const contentView = document.getElementById('contentView');
const contentEdit = document.getElementById('contentEdit');
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const deleteBtn = document.getElementById('deleteBtn');
const headerTitle = document.getElementById('headerTitle');
const backButton = document.querySelector('.back-button');

// Gestionnaire du bouton retour
backButton.addEventListener('click', () => {
    window.history.back();
});

async function loadQRCodes() {
    try {
    const resp = await fetch('/qrcodes', { credentials: 'include' });
    const data = await resp.json();
    qrcodes = data.qrcodes;
    headerTitle.textContent = `All your generated QR codes (${qrcodes.length})`;
    renderSources();
    } catch (err) {
    //console.error('Erreur chargement QRCodes:', err);
    }
}

function escapeHTML(str) {
    return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


function renderSources() {
    sourcesList.innerHTML = ''; // Clear existing list

    qrcodes.forEach(qr => {
        const isSelected = selectedItems.has(Number(qr.id));

        // Create elements
        const sourceItem = document.createElement('div');
        sourceItem.className = `source-item ${selectedQRCode?.id === qr.id ? 'selected' : ''}`;
        sourceItem.dataset.id = qr.id;

        const sourceContent = document.createElement('div');
        sourceContent.className = 'source-content';

        const checkboxWrapper = document.createElement('div');
        checkboxWrapper.className = 'checkbox-wrapper';

        const customCheckbox = document.createElement('div');
        customCheckbox.className = `custom-checkbox ${isSelected ? 'checked' : ''}`;
        customCheckbox.setAttribute('role', 'checkbox');
        customCheckbox.setAttribute('aria-checked', isSelected);

        const sourceInfo = document.createElement('div');
        sourceInfo.className = 'source-info';
        const infoSpan = document.createElement('span');
        infoSpan.textContent = escapeHTML(qr.property_info.substring(0, 40)) + '...'; // Use textContent

        const importedBy = document.createElement('div');
        importedBy.className = 'imported-by';
        importedBy.textContent = new Date(qr.created_at).toLocaleDateString(); // Use textContent

        // Assemble elements
        checkboxWrapper.appendChild(customCheckbox);
        sourceInfo.appendChild(infoSpan);

        sourceContent.appendChild(checkboxWrapper);
        sourceContent.appendChild(sourceInfo);
        sourceContent.appendChild(importedBy);

        sourceItem.appendChild(sourceContent);

        // Add event listeners
        customCheckbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSelection(qr.id);
        });

        sourceInfo.addEventListener('click', () => {
            selectQRCode(qr);
        });

        // Append to list
        sourcesList.appendChild(sourceItem);
    });
   
}


function toggleSelection(id) {
  const numericId = Number(id); // Conversion en nombre
  if (selectedItems.has(numericId)) {
    selectedItems.delete(numericId);
  } else {
    selectedItems.add(numericId);
  }
  updateDeleteButton();
  renderSources();
}

function updateDeleteButton() {
    deleteBtn.classList.toggle('visible', selectedItems.size > 0);
}

function selectQRCode(qr) {
    selectedQRCode = qr;
    sidePanel.classList.add('visible');
    contentView.textContent = qr.property_info;
    contentEdit.value = qr.property_info;
    renderSources();
}

function toggleEditMode(editing) {
    isEditing = editing;
    contentView.style.display = editing ? 'none' : 'block';
    contentEdit.classList.toggle('visible', editing);
    editBtn.style.display = editing ? 'none' : 'block';
    saveBtn.style.display = editing ? 'block' : 'none';
    cancelBtn.style.display = editing ? 'block' : 'none';
}

editBtn.addEventListener('click', () => {
    toggleEditMode(true);
});

cancelBtn.addEventListener('click', () => {
    contentEdit.value = selectedQRCode.property_info;
    toggleEditMode(false);
});

saveBtn.addEventListener('click', async () => {
    const newText = contentEdit.value;
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    try {
    loadingSpinner.style.display = 'block'; // Afficher le spinner
    saveBtn.disabled = true;

    const resp = await fetch(`/qrcodes/${selectedQRCode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_info: newText }),
        credentials: 'include'
    });
    
    const data = await resp.json();
    if (data.success) {
        selectedQRCode.property_info = newText;
        contentView.textContent = newText;
        toggleEditMode(false);
        renderSources();
    } else {
        alert(data.error || 'Update failed');
    }
    } catch (err) {
    console.error('Erreur update:', err);
    } finally {
    loadingSpinner.style.display = 'none'; // Cacher le spinner
    saveBtn.disabled = false;
    }
});

    /*saveBtn.addEventListener('click', async () => {
      const newText = contentEdit.value;
      try {
        const resp = await fetch(`/qrcodes/${selectedQRCode.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property_info: newText }),
          credentials: 'include'
        });
        const data = await resp.json();
        if (data.success) {
          selectedQRCode.property_info = newText;
          contentView.textContent = newText;
          toggleEditMode(false);
          renderSources();
        } else {
          alert(data.error || 'Update failed');
        }
      } catch (err) {
        console.error('Erreur update:', err);
      }
    });*/

deleteBtn.addEventListener('click', deleteSelected);

async function deleteSelected() {
    const idsArray = Array.from(selectedItems);
    try {
    const resp = await fetch('/qrcodes/deleteMany', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsArray }),
        credentials: 'include'
    });
    const data = await resp.json();
    if (data.success) {
        qrcodes = qrcodes.filter(qr => !selectedItems.has(qr.id));
        selectedItems.clear();
        selectedQRCode = null;
        sidePanel.classList.remove('visible');
        updateDeleteButton();
        renderSources();
    } else {
        alert(data.error || 'Delete failed');
    }
    } catch (err) {
    console.error('Erreur deleteMany:', err);
    }
}

window.addEventListener('DOMContentLoaded', loadQRCodes);