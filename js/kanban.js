/* ═══════════════════════════════════════════════════════
   CRM Kanban — Board Renderer & Drag-Drop Engine
   ═══════════════════════════════════════════════════════ */

const KanbanBoard = (() => {
  let boardEl = null;
  let currentDragDealId = null;
  let placeholder = null;
  let searchQuery = '';

  // ── Initialize ──
  function init(containerSelector) {
    boardEl = document.querySelector(containerSelector);
    if (!boardEl) return;
    render();
    bindEvents();
  }

  // ── Render Full Board ──
  function render() {
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const stages = CRMStore.getStages();
    stages.forEach(stage => {
      const col = createColumn(stage);
      boardEl.appendChild(col);
    });

    // "+ Add Column" card at the end of the board
    const addColCard = document.createElement('div');
    addColCard.className = 'kanban-column add-column-card';
    addColCard.innerHTML = `
      <button class="add-column-btn" id="btn-add-column">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add Column</span>
      </button>
    `;
    addColCard.querySelector('#btn-add-column').addEventListener('click', () => openStageModal(null));
    boardEl.appendChild(addColCard);

    updateStats();
  }

  // ── Create Column ──
  function createColumn(stage) {
    const deals = getFilteredDeals(stage.id);
    const totalValue = deals.reduce((s, d) => s + d.value, 0);

    const col = document.createElement('div');
    col.className = 'kanban-column';
    col.dataset.stage = stage.id;

    col.innerHTML = `
      <div class="column-header">
        <div class="column-header-left">
          <span class="column-dot" style="background: ${stage.color}"></span>
          <span class="column-name">${escapeHtml(stage.name)}</span>
          <span class="column-count" data-count="${stage.id}">${deals.length}</span>
        </div>
        <button class="column-edit-btn" title="Edit column name & color" data-stage-id="${stage.id}">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>
        </button>
      </div>
      <div class="column-value" data-value="${stage.id}">${CRMStore.formatCurrency(totalValue)}</div>
      <div class="column-cards" data-stage="${stage.id}">
        ${deals.length === 0 ? '<div class="column-empty">No deals yet</div>' : ''}
      </div>
    `;

    const editBtn = col.querySelector('.column-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openStageModal(stage.id);
      });
    }

    const cardsContainer = col.querySelector('.column-cards');

    deals.forEach(deal => {
      const card = createCard(deal);
      cardsContainer.appendChild(card);
    });

    // Drop zone events
    setupDropZone(cardsContainer, stage.id, col);

    return col;
  }

  // ── Create Card ──
  function createCard(deal) {
    const days = CRMStore.getDaysInStage(deal);
    const initials = CRMStore.getInitials(deal.contactName);
    const avatarColor = CRMStore.getAvatarColor(deal.contactName);

    const card = document.createElement('div');
    card.className = 'deal-card';
    card.dataset.dealId = deal.id;
    card.draggable = true;

    const priorityColor = getPriorityColor(deal.priority);

    card.innerHTML = `
      <div class="deal-card-top">
        <div class="deal-avatar" style="background: ${avatarColor}">${initials}</div>
        <div class="deal-info">
          <div class="deal-title">${escapeHtml(deal.title)}</div>
          <div class="deal-company">${escapeHtml(deal.contactName)}${deal.company ? ' · ' + escapeHtml(deal.company) : ''}</div>
        </div>
      </div>
      <div class="deal-card-bottom">
        <span class="deal-value">${CRMStore.formatCurrency(deal.value)}</span>
        <div class="deal-meta">
          <span class="deal-priority" style="background: ${priorityColor}" title="${deal.priority}"></span>
          <span class="deal-days">${days}d</span>
        </div>
      </div>
    `;

    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    // Click to edit
    card.addEventListener('click', (e) => {
      if (card.classList.contains('dragging')) return;
      CRMModal.openEdit(deal.id);
    });

    return card;
  }

  // ── Drop Zone Setup ──
  function setupDropZone(container, stageId, columnEl) {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      columnEl.classList.add('drag-over');

      // Insert placeholder at correct position
      const afterElement = getDragAfterElement(container, e.clientY);
      if (!placeholder) createPlaceholder();

      if (afterElement) {
        container.insertBefore(placeholder, afterElement);
      } else {
        container.appendChild(placeholder);
      }

      // Remove empty state
      const emptyEl = container.querySelector('.column-empty');
      if (emptyEl) emptyEl.remove();
    });

    container.addEventListener('dragleave', (e) => {
      // Only remove if truly leaving the column
      if (!columnEl.contains(e.relatedTarget)) {
        columnEl.classList.remove('drag-over');
        removePlaceholder(container);
      }
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      columnEl.classList.remove('drag-over');
      removePlaceholder(container);

      if (currentDragDealId) {
        const deal = CRMStore.getDealById(currentDragDealId);
        if (deal && deal.stage !== stageId) {
          await CRMStore.moveDeal(currentDragDealId, stageId);
          showToast(`Moved to ${getStageLabel(stageId)}`, 'success');
        }
        // Re-render to reflect new state
        render();
      }
    });
  }

  // ── Drag Handlers ──
  function handleDragStart(e) {
    const card = e.currentTarget;
    currentDragDealId = card.dataset.dealId;

    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', currentDragDealId);

    // Add dragging class after a frame to avoid flicker
    requestAnimationFrame(() => {
      card.classList.add('dragging');
    });
  }

  function handleDragEnd(e) {
    const card = e.currentTarget;
    card.classList.remove('dragging');
    currentDragDealId = null;

    // Clean up all columns
    document.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });
    removePlaceholderGlobal();
  }

  // ── Placeholder ──
  function createPlaceholder() {
    placeholder = document.createElement('div');
    placeholder.className = 'drop-placeholder';
  }

  function removePlaceholder(container) {
    if (placeholder && container.contains(placeholder)) {
      container.removeChild(placeholder);
    }
    placeholder = null;
  }

  function removePlaceholderGlobal() {
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
    placeholder = null;
  }

  // ── Find insertion point ──
  function getDragAfterElement(container, y) {
    const cards = [...container.querySelectorAll('.deal-card:not(.dragging)')];
    return cards.reduce((closest, card) => {
      const box = card.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: card };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // ── Search / Filter ──
  function setSearchQuery(query) {
    searchQuery = query.toLowerCase().trim();
    render();
  }

  function getFilteredDeals(stageId) {
    let deals = CRMStore.getDealsByStage(stageId);
    if (searchQuery) {
      deals = deals.filter(d =>
        d.title.toLowerCase().includes(searchQuery) ||
        d.contactName.toLowerCase().includes(searchQuery) ||
        d.company.toLowerCase().includes(searchQuery)
      );
    }
    return deals;
  }

  // ── Update Stats in Topbar ──
  function updateStats() {
    const stats = CRMStore.getStats();
    const totalDealsEl = document.getElementById('stat-total-deals');
    const totalValueEl = document.getElementById('stat-total-value');
    if (totalDealsEl) totalDealsEl.textContent = stats.totalDeals;
    if (totalValueEl) totalValueEl.textContent = CRMStore.formatCurrency(stats.totalValue);
  }

  // ── Bind Store Events ──
  function bindEvents() {
    CRMStore.on('deals:changed', () => {
      render();
    });
    CRMStore.on('stages:changed', () => {
      render();
    });
  }

  // ── Stage Column Edit / Add Modal ──
  function openStageModal(stageId) {
    const backdropEl = document.getElementById('modal-backdrop');
    if (!backdropEl) return;

    const stages = CRMStore.getStages();
    const stage = stageId ? stages.find(s => s.id === stageId) : null;
    const isEdit = !!stage;

    const presetColors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#ef4444', '#3b82f6', '#06b6d4',
      '#14b8a6', '#a855f7', '#f97316', '#64748b'
    ];

    let selectedColor = stage ? stage.color : '#6366f1';

    const panel = backdropEl.querySelector('.modal-panel');
    panel.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Edit Stage Column' : 'Add Stage Column'}</h3>
        <button class="modal-close" id="modal-close-btn" aria-label="Close modal">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <form id="stage-edit-form" class="modal-form">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="stage-name-input">Column Name</label>
            <input class="form-input" type="text" id="stage-name-input" value="${stage ? escapeHtml(stage.name) : ''}" placeholder="e.g. Lead, In Discovery, Contract Sent" required autofocus>
          </div>

          <div class="form-group">
            <label class="form-label">Column Color Dot</label>
            <div class="color-palette">
              ${presetColors.map(c => `
                <button type="button" class="color-swatch ${c.toLowerCase() === selectedColor.toLowerCase() ? 'active' : ''}" data-color="${c}" style="background: ${c};"></button>
              `).join('')}
              <div class="custom-color-wrapper" title="Custom color picker">
                <input type="color" id="stage-custom-color" class="color-input-picker" value="${selectedColor}">
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: ${isEdit ? 'space-between' : 'flex-end'};">
          ${isEdit ? `
            <button type="button" class="btn btn-danger" id="stage-delete-btn">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete Column</span>
            </button>
          ` : ''}
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-ghost" id="stage-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Column</button>
          </div>
        </div>
      </form>

    `;

    backdropEl.classList.add('open');

    // Close buttons
    panel.querySelector('#modal-close-btn').addEventListener('click', () => backdropEl.classList.remove('open'));
    panel.querySelector('#stage-cancel-btn').addEventListener('click', () => backdropEl.classList.remove('open'));

    // Color Swatches Selection
    const swatches = panel.querySelectorAll('.color-swatch');
    const customColorInput = panel.querySelector('#stage-custom-color');

    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        selectedColor = swatch.dataset.color;
        customColorInput.value = selectedColor;
      });
    });

    customColorInput.addEventListener('input', (e) => {
      swatches.forEach(s => s.classList.remove('active'));
      selectedColor = e.target.value;
    });

    // Form submit
    panel.querySelector('#stage-edit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = panel.querySelector('#stage-name-input').value.trim();
      if (!name) return;

      if (isEdit) {
        CRMStore.updateStage(stageId, { name, color: selectedColor });
        showToast(`Updated column "${name}"`, 'success');
      } else {
        CRMStore.addStage(name, selectedColor);
        showToast(`Added column "${name}"`, 'success');
      }

      backdropEl.classList.remove('open');
      render();
    });

    // Delete stage
    if (isEdit) {
      const deleteBtn = panel.querySelector('#stage-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          if (confirm(`Are you sure you want to delete the "${stage.name}" column? Any deals in this column will be moved to the first active column.`)) {
            try {
              CRMStore.deleteStage(stageId);
              showToast(`Deleted column "${stage.name}"`, 'info');
              backdropEl.classList.remove('open');
              render();
            } catch (err) {
              alert(err.message);
            }
          }
        });
      }
    }
  }

  // ── Helpers ──
  function getPriorityColor(priority) {
    const map = {
      low: 'var(--priority-low)',
      medium: 'var(--priority-medium)',
      high: 'var(--priority-high)',
      urgent: 'var(--priority-urgent)',
    };
    return map[priority] || map.medium;
  }

  function getStageLabel(stageId) {
    const stage = CRMStore.STAGES.find(s => s.id === stageId);
    return stage ? stage.name : stageId;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Public API ──
  return {
    init,
    render,
    setSearchQuery,
  };
})();

// ── Toast Notification ──
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = {
    success: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || iconMap.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2500);
}
