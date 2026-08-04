/* ═══════════════════════════════════════════════════════
   CRM Kanban — Contacts Directory Module
   ═══════════════════════════════════════════════════════ */

const ContactsView = (() => {
  let containerEl = null;
  let searchQuery = '';

  function init(containerSelector) {
    containerEl = document.querySelector(containerSelector);
    if (!containerEl) return;
    render();
    bindEvents();
  }

  function setSearchQuery(query) {
    searchQuery = query.toLowerCase().trim();
    render();
  }

  function getContacts() {
    const deals = CRMStore.getAllDeals();
    const contactsMap = {};

    deals.forEach(deal => {
      const key = (deal.contactName || 'Unknown').trim().toLowerCase();
      if (!contactsMap[key]) {
        contactsMap[key] = {
          id: 'contact_' + Math.abs(hashString(key)),
          name: deal.contactName || 'Unknown Contact',
          company: deal.company || 'N/A',
          email: deal.email || 'N/A',
          phone: deal.phone || 'N/A',
          deals: [],
          totalValue: 0,
        };
      }

      contactsMap[key].deals.push(deal);
      contactsMap[key].totalValue += deal.value;
      if (deal.company && contactsMap[key].company === 'N/A') contactsMap[key].company = deal.company;
      if (deal.email && contactsMap[key].email === 'N/A') contactsMap[key].email = deal.email;
      if (deal.phone && contactsMap[key].phone === 'N/A') contactsMap[key].phone = deal.phone;
    });

    let contacts = Object.values(contactsMap);

    if (searchQuery) {
      contacts = contacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery) ||
        c.company.toLowerCase().includes(searchQuery) ||
        c.email.toLowerCase().includes(searchQuery) ||
        c.phone.toLowerCase().includes(searchQuery)
      );
    }

    return contacts;
  }

  function render() {
    if (!containerEl) return;

    const contacts = getContacts();

    containerEl.innerHTML = `
      <div class="contacts-page">
        <div class="contacts-header">
          <div class="contacts-header-left">
            <h2 class="section-title">Contacts Directory</h2>
            <span class="contacts-count-badge">${contacts.length} Contact${contacts.length !== 1 ? 's' : ''}</span>
          </div>
          <button class="btn btn-primary" id="btn-add-contact-deal">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Add Contact / Deal</span>
          </button>
        </div>

        <div class="contacts-grid">
          ${contacts.length === 0 ? `
            <div class="contacts-empty">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              <p>No contacts found</p>
            </div>
          ` : contacts.map(contact => createContactCard(contact)).join('')}
        </div>
      </div>
    `;

    // Wire up Add Deal button inside contacts header
    const addBtn = containerEl.querySelector('#btn-add-contact-deal');
    if (addBtn) {
      addBtn.addEventListener('click', () => CRMModal.openAdd());
    }

    // Wire up contact deal click events
    containerEl.querySelectorAll('.contact-deal-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const dealId = chip.dataset.dealId;
        if (dealId) CRMModal.openEdit(dealId);
      });
    });
  }

  function createContactCard(contact) {
    const initials = CRMStore.getInitials(contact.name);
    const avatarColor = CRMStore.getAvatarColor(contact.name);

    const dealsListHtml = contact.deals.map(d => `
      <span class="contact-deal-chip" data-deal-id="${d.id}" title="${escapeHtml(d.title)} (${CRMStore.formatCurrency(d.value)})">
        <span class="deal-chip-stage ${d.stage}"></span>
        ${escapeHtml(d.title)}
      </span>
    `).join('');

    return `
      <div class="contact-card">
        <div class="contact-card-header">
          <div class="contact-avatar" style="background: ${avatarColor}">${initials}</div>
          <div class="contact-main-info">
            <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
            <p class="contact-company">${escapeHtml(contact.company)}</p>
          </div>
        </div>
        
        <div class="contact-details-list">
          <div class="contact-detail-item">
            <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>${escapeHtml(contact.email)}</span>
          </div>
          <div class="contact-detail-item">
            <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <span>${escapeHtml(contact.phone)}</span>
          </div>
        </div>

        <div class="contact-card-footer">
          <div class="contact-stats-col">
            <span class="contact-stat-label">Deals</span>
            <span class="contact-stat-val">${contact.deals.length}</span>
          </div>
          <div class="contact-stats-col align-right">
            <span class="contact-stat-label">Total Value</span>
            <span class="contact-stat-val highlight">${CRMStore.formatCurrency(contact.totalValue)}</span>
          </div>
        </div>

        <div class="contact-deals-section">
          <span class="contact-deals-title">Associated Deals</span>
          <div class="contact-deals-list">
            ${dealsListHtml}
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    CRMStore.on('deals:changed', () => render());
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    render,
    setSearchQuery,
  };
})();
