/* ═══════════════════════════════════════════════════════
   CRM Kanban — Analytics & KPI Dashboard Module
   ═══════════════════════════════════════════════════════ */

const AnalyticsView = (() => {
  let containerEl = null;

  function init(containerSelector) {
    containerEl = document.querySelector(containerSelector);
    if (!containerEl) return;
    render();
    bindEvents();
  }

  function render() {
    if (!containerEl) return;

    const deals = CRMStore.getAllDeals();
    const stats = CRMStore.getStats();

    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

    const wonDeals = deals.filter(d => d.stage === 'won');
    const lostDeals = deals.filter(d => d.stage === 'lost');
    const closedCount = wonDeals.length + lostDeals.length;
    const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : 0;

    const avgDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;

    // Top 5 highest value deals
    const topDeals = [...deals].sort((a, b) => b.value - a.value).slice(0, 5);

    // Priority counts
    const priorityCounts = { low: 0, medium: 0, high: 0, urgent: 0 };
    deals.forEach(d => {
      if (priorityCounts[d.priority] !== undefined) priorityCounts[d.priority]++;
    });

    containerEl.innerHTML = `
      <div class="analytics-page">
        <!-- ── Top KPI Grid ── -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Total Pipeline</span>
              <div class="kpi-icon-wrap accent">
                <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
            </div>
            <div class="kpi-value">${CRMStore.formatCurrency(totalValue)}</div>
            <div class="kpi-subtitle">${totalDeals} Total Deals</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Win Rate</span>
              <div class="kpi-icon-wrap success">
                <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              </div>
            </div>
            <div class="kpi-value">${winRate}%</div>
            <div class="kpi-subtitle">${wonDeals.length} Won / ${lostDeals.length} Lost</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Average Deal Size</span>
              <div class="kpi-icon-wrap info">
                <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              </div>
            </div>
            <div class="kpi-value">${CRMStore.formatCurrency(avgDealSize)}</div>
            <div class="kpi-subtitle">Across all active stages</div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Active Deals</span>
              <div class="kpi-icon-wrap warning">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>
              </div>
            </div>
            <div class="kpi-value">${totalDeals - closedCount}</div>
            <div class="kpi-subtitle">In pipeline progression</div>
          </div>
        </div>

        <!-- ── Charts Grid ── -->
        <div class="analytics-charts-grid">
          
          <!-- Stage Funnel Breakdown -->
          <div class="chart-card">
            <div class="chart-card-header">
              <h3 class="chart-title">Pipeline Stage Distribution</h3>
            </div>
            <div class="stage-funnel-list">
              ${CRMStore.STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage.id);
                const stageVal = stageDeals.reduce((sum, d) => sum + d.value, 0);
                const percent = totalValue > 0 ? Math.round((stageVal / totalValue) * 100) : 0;
                return `
                  <div class="funnel-item">
                    <div class="funnel-label-row">
                      <div class="funnel-stage-info">
                        <span class="column-dot" style="background: ${stage.color}"></span>
                        <span class="funnel-stage-name">${stage.name}</span>
                        <span class="funnel-stage-count">(${stageDeals.length})</span>
                      </div>
                      <span class="funnel-stage-val">${CRMStore.formatCurrency(stageVal)}</span>
                    </div>
                    <div class="funnel-bar-track">
                      <div class="funnel-bar-fill" style="width: ${percent}%; background: ${stage.color}"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Priority & Win Ratio Panel -->
          <div class="chart-card">
            <div class="chart-card-header">
              <h3 class="chart-title">Deal Priority Distribution</h3>
            </div>
            <div class="priority-pills-list">
              <div class="priority-pill-row">
                <span class="priority-dot urgent"></span>
                <span class="priority-label">Urgent</span>
                <span class="priority-count">${priorityCounts.urgent}</span>
              </div>
              <div class="priority-pill-row">
                <span class="priority-dot high"></span>
                <span class="priority-label">High</span>
                <span class="priority-count">${priorityCounts.high}</span>
              </div>
              <div class="priority-pill-row">
                <span class="priority-dot medium"></span>
                <span class="priority-label">Medium</span>
                <span class="priority-count">${priorityCounts.medium}</span>
              </div>
              <div class="priority-pill-row">
                <span class="priority-dot low"></span>
                <span class="priority-label">Low</span>
                <span class="priority-count">${priorityCounts.low}</span>
              </div>
            </div>

            <div class="chart-card-header margin-top">
              <h3 class="chart-title">Top Value Deals</h3>
            </div>
            <div class="top-deals-mini-list">
              ${topDeals.map(d => `
                <div class="top-deal-item" data-deal-id="${d.id}">
                  <div class="top-deal-info">
                    <span class="top-deal-title">${escapeHtml(d.title)}</span>
                    <span class="top-deal-contact">${escapeHtml(d.contactName)}</span>
                  </div>
                  <span class="top-deal-val">${CRMStore.formatCurrency(d.value)}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
    `;

    // Click top deal to view details
    containerEl.querySelectorAll('.top-deal-item').forEach(item => {
      item.addEventListener('click', () => {
        const dealId = item.dataset.dealId;
        if (dealId) CRMModal.openEdit(dealId);
      });
    });
  }

  function bindEvents() {
    CRMStore.on('deals:changed', () => render());
    CRMStore.on('currency:changed', () => render());
    CRMStore.on('stages:changed', () => render());
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    render,
  };
})();
