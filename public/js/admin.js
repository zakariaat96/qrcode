 // Quand la page est chargée
 document.addEventListener('DOMContentLoaded', () => {
    // 1) Charger les stats pour le dashboard
    loadDashboardStats();

    // 2) Charger la liste des utilisateurs (pour le dashboard et la section "users")
    loadUsers();

    // 3) Charger les QR codes
    loadQRCodes();
  });

  async function loadDashboardStats() {
    try {
      const response = await fetch('/hidden-admin-orbicall/stats'); 
      const data = await response.json();

      document.getElementById('stat-total-users').textContent = data.totalUsers;
      document.getElementById('stat-total-qrcodes').textContent = data.totalQRCodes;
      document.getElementById('stat-today-scans').textContent = data.totalScansToday;
      document.getElementById('stat-revenue').textContent = '$' + data.totalRevenue;

    } catch (error) {
      console.error('Erreur loadDashboardStats:', error);
    }
  }

  // Charger les QR codes et compter par utilisateur
  async function getQRCodeCountByUser() {
    try {
      const response = await fetch('/hidden-admin-orbicall/qrcodes');
      const qrcodes = await response.json();
      
      // Créer un objet qui compte les QR codes par user_id
      const qrCountByUser = {};
      qrcodes.forEach(qr => {
        if (qr.user_id in qrCountByUser) {
          qrCountByUser[qr.user_id]++;
        } else {
          qrCountByUser[qr.user_id] = 1;
        }
      });
      
      return qrCountByUser;
    } catch (error) {
      console.error('Erreur getQRCodeCountByUser:', error);
      return {};
    }
  }

  async function loadUsers() {
    try {
      // Charger les utilisateurs et le compte de QR codes
      const [usersResponse, qrCountByUser] = await Promise.all([
        fetch('/hidden-admin-orbicall/users'),
        getQRCodeCountByUser()
      ]);
      
      const users = await usersResponse.json();

      // Mise à jour du tableau des users
      const usersTbody = document.getElementById('users-tbody');
      while (usersTbody.firstChild) {
        usersTbody.removeChild(usersTbody.firstChild);
      }

      // Mise à jour du tableau du dashboard
      const dashboardUsersTbody = document.getElementById('dashboard-users-tbody');
      while (dashboardUsersTbody.firstChild) {
        dashboardUsersTbody.removeChild(dashboardUsersTbody.firstChild);
      }

      users.forEach((user) => {
        // Obtenir le nombre de QR codes pour cet utilisateur
        const qrCount = qrCountByUser[user.id] || 0;

        // Création de la ligne pour la section Users
        const userTr = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.textContent = user.id;
        userTr.appendChild(tdId);

        const tdName = document.createElement('td');
        tdName.textContent = user.display_name || (user.first_name + ' ' + user.last_name);
        userTr.appendChild(tdName);

        const tdEmail = document.createElement('td');
        tdEmail.textContent = user.email;
        userTr.appendChild(tdEmail);

        const tdJoin = document.createElement('td');
        tdJoin.textContent = user.joinDate ? user.joinDate.split('T')[0] : '';
        userTr.appendChild(tdJoin);

        const tdStatus = document.createElement('td');
        const spanStatus = document.createElement('span');
        spanStatus.classList.add('status-badge');
        if (user.subscription_type) {
          spanStatus.classList.add('status-active');
          spanStatus.textContent = 'Active';
        } else {
          spanStatus.classList.add('status-inactive');
          spanStatus.textContent = 'Inactive';
        }
        tdStatus.appendChild(spanStatus);
        userTr.appendChild(tdStatus);

        usersTbody.appendChild(userTr);

        // Création de la ligne pour le dashboard
        const dashboardTr = document.createElement('tr');

        const tdDashName = document.createElement('td');
        tdDashName.textContent = user.display_name || (user.first_name + ' ' + user.last_name);
        dashboardTr.appendChild(tdDashName);

        const tdDashPlan = document.createElement('td');
        tdDashPlan.textContent = user.subscription_type || 'Free';
        dashboardTr.appendChild(tdDashPlan);

        const tdDashQr = document.createElement('td');
        tdDashQr.textContent = qrCount;
        dashboardTr.appendChild(tdDashQr);

        const tdDashStatus = document.createElement('td');
        const spanDashStatus = document.createElement('span');
        spanDashStatus.classList.add('status-badge');
        if (user.subscription_type) {
          spanDashStatus.classList.add('status-active');
          spanDashStatus.textContent = 'Active';
        } else {
          spanDashStatus.classList.add('status-inactive');
          spanDashStatus.textContent = 'Inactive';
        }
        tdDashStatus.appendChild(spanDashStatus);
        dashboardTr.appendChild(tdDashStatus);

        dashboardUsersTbody.appendChild(dashboardTr);
      });
    } catch (error) {
      console.error('Erreur loadUsers:', error);
    }
  }

  async function loadQRCodes() {
    try {
      const response = await fetch('/hidden-admin-orbicall/qrcodes');
      const qrcodes = await response.json();

      const qrcodesGrid = document.getElementById('qrcodes-grid');
      while (qrcodesGrid.firstChild) {
        qrcodesGrid.removeChild(qrcodesGrid.firstChild);
      }

      qrcodes.forEach(qr => {
        const divCard = document.createElement('div');
        divCard.classList.add('qr-card');

        const maxLength = 50; // nb de caractères à afficher avant "..."
        const shortInfo = qr.property_info
          ? (qr.property_info.length > maxLength
              ? qr.property_info.substring(0, maxLength) + '...'
              : qr.property_info)
          : 'Property #' + qr.id;

        const img = document.createElement('img');
        img.src = qr.qr_code_data;
        img.alt = 'QR Code';
        divCard.appendChild(img);

        const h3 = document.createElement('h3');
        h3.textContent = shortInfo;
        divCard.appendChild(h3);

        const p = document.createElement('p');
        p.textContent = 'Created: ' + (qr.created_at ? qr.created_at.split('T')[0] : '');
        divCard.appendChild(p);

        const button = document.createElement('button');
        button.classList.add('action-btn');
        button.textContent = 'View Details';
        button.addEventListener('click', () => showQRCodeDetails(qr.id));
        divCard.appendChild(button);

        qrcodesGrid.appendChild(divCard);
      });
    } catch (error) {
      console.error('Erreur loadQRCodes:', error);
    }
  }

  function showQRCodeDetails(qrId) {
    // Redirige vers une page /admin/qrcode-details.html?id=QR_ID
    window.location.href = `/hidden-admin-orbicall/qrcode-details.html?id=${qrId}`;
  }

  // Fonction générique pour filtrer les tableaux
  function filterTable(tableId, searchValue) {
    const tbody = document.getElementById(tableId);
    const rows = tbody.getElementsByTagName('tr');
    
    searchValue = searchValue.toLowerCase();
    
    for (let row of rows) {
      let text = '';
      const cells = row.getElementsByTagName('td');
      
      for (let cell of cells) {
        text += cell.textContent.toLowerCase() + ' ';
      }
      
      row.style.display = text.includes(searchValue) ? '' : 'none';
    }
  }

  function filterUsersByName(searchValue) {
    const tbody = document.getElementById('users-tbody');
    const rows = tbody.getElementsByTagName('tr');
    
    searchValue = searchValue.toLowerCase();
    
    for (let row of rows) {
      const nameCell = row.getElementsByTagName('td')[1];
      if (nameCell) {
        const name = nameCell.textContent.toLowerCase();
        row.style.display = name.includes(searchValue) ? '' : 'none';
      }
    }
  }

  // Fonction pour filtrer la grille des QR codes
  function filterQRGrid(searchValue) {
    const grid = document.getElementById('qrcodes-grid');
    const cards = grid.getElementsByClassName('qr-card');
    
    searchValue = searchValue.toLowerCase();
    
    for (let card of cards) {
      const cardText = card.textContent.toLowerCase();
      card.style.display = cardText.includes(searchValue) ? '' : 'none';
    }
  }

  // Initialisation des écouteurs d'événements pour la recherche
  document.addEventListener('DOMContentLoaded', () => {
    const dashboardSearch = document.querySelector('#dashboard .search-bar');
    if (dashboardSearch) {
      dashboardSearch.addEventListener('input', (e) => {
        filterTable('dashboard-users-tbody', e.target.value);
      });
    }
    
    const usersSearch = document.querySelector('#users .search-bar');
    if (usersSearch) {
      usersSearch.addEventListener('input', (e) => {
        filterUsersByName(e.target.value);
      });
    }
    
    const qrSearch = document.querySelector('#qrcodes .search-bar');
    if (qrSearch) {
      qrSearch.addEventListener('input', (e) => {
        filterQRGrid(e.target.value);
      });
    }
  });

  // Gestion du changement de section
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
      
      item.classList.add('active');
      
      const sectionId = item.getAttribute('data-section');
      document.getElementById(sectionId).classList.add('active');
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadUsers();
    loadQRCodes();

    // Bouton Send
    const sendBtn = document.querySelector('.send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const title = document.querySelector('.notification-input').value;
        const message = document.querySelector('.notification-textarea').value;
        const targetAudience = document.querySelector('.notification-select').value;
        
        const emailChecked = document.getElementById('email-notification').checked;
        const pushChecked = document.getElementById('push-notification').checked;
        
        try {
          const response = await fetch('/hidden-admin-orbicall/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              message,
              targetAudience,
              emailChecked,
              pushChecked
            })
          });
          const result = await response.json();

          if (response.ok) {
            alert('Notification sent successfully!');
          } else {
            alert('Error sending notification: ' + (result.error || 'Unknown error'));
          }
        } catch (err) {
          console.error('Error sending notification:', err);
          alert('Failed to send notification');
        }
      });
    }
  });

  async function handleLogout() {
    try {
      const response = await fetch('/api/hidden-admin-orbicall/logout');
      if (response.ok) {
        window.location.href = '/hidden-admin-orbicall';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }