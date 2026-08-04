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

    CRMStore.STAGES.forEach(stage => {
      const col = createColumn(stage);
      boardEl.appendChild(col);
    });

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
          <span class="column-name">${stage.name}</span>
          <span class="column-count" data-count="${stage.id}">${deals.length}</span>
        </div>
      </div>
      <div class="column-value" data-value="${stage.id}">${CRMStore.formatCurrency(totalValue)}</div>
      <div class="column-cards" data-stage="${stage.id}">
        ${deals.length === 0 ? '<div class="column-empty">No deals yet</div>' : ''}
      </div>
    `;

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
