/* ═══════════════════════════════════════════════════════
   CRM Kanban — Modal System (Add / Edit Deal)
   ═══════════════════════════════════════════════════════ */

const CRMModal = (() => {
  let backdropEl = null;
  let currentDealId = null;
  let isOpen = false;

  // ── Initialize ──
  function init() {
    backdropEl = document.getElementById('modal-backdrop');
    if (!backdropEl) return;

    // Close on backdrop click
    backdropEl.addEventListener('click', (e) => {
      if (e.target === backdropEl) close();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) close();
    });
  }

  // ── Open Add Modal ──
  function openAdd() {
    currentDealId = null;
    renderForm(null);
    open();
  }

  // ── Open Edit Modal ──
  function openEdit(dealId) {
    const deal = CRMStore.getDealById(dealId);
    if (!deal) return;
    currentDealId = dealId;
    renderForm(deal);
    open();
  }

  // ── Open / Close ──
  function open() {
    if (!backdropEl) return;
    isOpen = true;
    backdropEl.classList.add('open');
    // Focus first input
    setTimeout(() => {
      const firstInput = backdropEl.querySelector('.form-input, .form-select');
      if (firstInput) firstInput.focus();
    }, 300);
  }

  function close() {
    if (!backdropEl) return;
    isOpen = false;
    backdropEl.classList.remove('open');
    currentDealId = null;
  }

  // ── Render Form ──
  function renderForm(deal) {
    const panel = backdropEl.querySelector('.modal-panel');
    if (!panel) return;

    const isEdit = !!deal;
    const title = isEdit ? 'Edit Deal' : 'New Deal';

    // Stage options
    const stageOptions = CRMStore.STAGES.map(s =>
      `<option value="${s.id}" ${deal && deal.stage === s.id ? 'selected' : ''}>${s.name}</option>`
    ).join('');

    // Priority options
    const priorityOptions = CRMStore.PRIORITIES.map(p =>
      `<option value="${p}" ${deal && deal.priority === p ? 'selected' : ''}>${capitalize(p)}</option>`
    ).join('');

    panel.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close" id="modal-close-btn" aria-label="Close">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="modal-body">
        <form id="deal-form" class="form-grid" novalidate>
          <div class="form-group full-width">
            <label class="form-label" for="deal-title">Deal Title *</label>
            <input class="form-input" type="text" id="deal-title" placeholder="e.g. Enterprise License" value="${isEdit ? escapeAttr(deal.title) : ''}" required>
            <span class="form-error" id="error-title"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="deal-contact">Contact Name *</label>
            <input class="form-input" type="text" id="deal-contact" placeholder="e.g. Sarah Chen" value="${isEdit ? escapeAttr(deal.contactName) : ''}" required>
            <span class="form-error" id="error-contact"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="deal-company">Company</label>
            <input class="form-input" type="text" id="deal-company" placeholder="e.g. TechNova Inc." value="${isEdit ? escapeAttr(deal.company) : ''}">
          </div>

          <div class="form-group">
            <label class="form-label" for="deal-email">Email</label>
            <input class="form-input" type="email" id="deal-email" placeholder="email@example.com" value="${isEdit ? escapeAttr(deal.email) : ''}">
          </div>

          <div class="form-group">
            <label class="form-label" for="deal-phone">Phone</label>
            <input class="form-input" type="tel" id="deal-phone" placeholder="+1 555-0100" value="${isEdit ? escapeAttr(deal.phone) : ''}">
          </div>

          <div class="form-group">
            <label class="form-label" for="deal-value">Deal Value ($) *</label>
            <input class="form-input" type="number" id="deal-value" placeholder="50000" min="0" value="${isEdit ? deal.value : ''}" required>
            <span class="form-error" id="error-value"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="deal-stage">Stage</label>
            <select class="form-select" id="deal-stage">
              ${stageOptions}
            </select>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="deal-priority">Priority</label>
            <select class="form-select" id="deal-priority">
              ${priorityOptions}
            </select>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="deal-notes">Notes</label>
            <textarea class="form-textarea" id="deal-notes" placeholder="Add any notes about this deal..." rows="3">${isEdit ? escapeAttr(deal.notes) : ''}</textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <div class="modal-footer-left">
          ${isEdit ? '<button class="btn btn-danger" id="modal-delete-btn">Delete</button>' : '<span></span>'}
        </div>
        <div class="modal-footer-right">
          <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="modal-save-btn">${isEdit ? 'Save Changes' : 'Create Deal'}</button>
        </div>
      </div>
    `;

    // Wire up buttons
    panel.querySelector('#modal-close-btn').addEventListener('click', close);
    panel.querySelector('#modal-cancel-btn').addEventListener('click', close);
    panel.querySelector('#modal-save-btn').addEventListener('click', handleSave);

    const deleteBtn = panel.querySelector('#modal-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', handleDelete);
    }

    // Enter key to save
    panel.querySelector('#deal-form').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleSave();
      }
    });
  }

  // ── Handle Save ──
  async function handleSave() {
    // Gather form data
    const title = document.getElementById('deal-title').value.trim();
    const contactName = document.getElementById('deal-contact').value.trim();
    const company = document.getElementById('deal-company').value.trim();
    const email = document.getElementById('deal-email').value.trim();
    const phone = document.getElementById('deal-phone').value.trim();
    const value = document.getElementById('deal-value').value;
    const stage = document.getElementById('deal-stage').value;
    const priority = document.getElementById('deal-priority').value;
    const notes = document.getElementById('deal-notes').value.trim();

    // Validate
    let valid = true;
    clearErrors();

    if (!title) {
      showFieldError('title', 'Deal title is required');
      valid = false;
    }
    if (!contactName) {
      showFieldError('contact', 'Contact name is required');
      valid = false;
    }
    if (!value || parseFloat(value) < 0) {
      showFieldError('value', 'Enter a valid deal value');
      valid = false;
    }

    if (!valid) return;

    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) saveBtn.disabled = true;

    const dealData = { title, contactName, company, email, phone, value, stage, priority, notes };

    try {
      if (currentDealId) {
        await CRMStore.updateDeal(currentDealId, dealData);
        showToast('Deal updated successfully', 'success');
      } else {
        await CRMStore.addDeal(dealData);
        showToast('Deal created successfully', 'success');
      }
      close();
    } catch (err) {
      console.error('Save deal error:', err);
      showToast('Error saving deal', 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  // ── Handle Delete ──
  async function handleDelete() {
    if (!currentDealId) return;
    const deal = CRMStore.getDealById(currentDealId);
    if (deal && confirm(`Delete "${deal.title}"? This cannot be undone.`)) {
      const deleteBtn = document.getElementById('modal-delete-btn');
      if (deleteBtn) deleteBtn.disabled = true;

      try {
        await CRMStore.deleteDeal(currentDealId);
        showToast('Deal deleted', 'error');
        close();
      } catch (err) {
        console.error('Delete deal error:', err);
        showToast('Error deleting deal', 'error');
      } finally {
        if (deleteBtn) deleteBtn.disabled = false;
      }
    }
  }

  // ── Validation helpers ──
  function showFieldError(field, message) {
    const errorEl = document.getElementById(`error-${field}`);
    const inputEl = document.getElementById(`deal-${field}`);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add('error');
  }

  function clearErrors() {
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-input.error, .form-select.error').forEach(el => el.classList.remove('error'));
  }

  // ── Helpers ──
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeAttr(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Public API ──
  return {
    init,
    openAdd,
    openEdit,
    close,
  };
})();
