/* ═══════════════════════════════════════════════════════
   CRM Kanban — Application Entry Point & Multi-View Router
   ═══════════════════════════════════════════════════════ */

let appInitialized = false;
let currentActiveView = 'pipeline';

document.addEventListener('DOMContentLoaded', () => {
  // ── Initialize Theme (before anything else) ──
  applyTheme(CRMStore.getTheme());

  // ── Initialize Auth (controls login screen vs app screen) ──
  CRMAuth.init();
});

// ── Called by CRMAuth after successful authentication ──
async function initApp() {
  // Prevent double-init
  if (appInitialized) return;
  appInitialized = true;

  // ── Initialize Sidebar ──
  const sidebar = document.getElementById('sidebar');
  const sidebarState = CRMStore.getSidebarState();
  if (sidebarState === 'collapsed') {
    sidebar.classList.add('collapsed');
  }

  // ── Sidebar Toggle ──
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      CRMStore.setSidebarState(sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
    });
  }

  // ── Mobile Sidebar ──
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      sidebarOverlay.classList.toggle('visible');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      sidebarOverlay.classList.remove('visible');
    });
  }

  // ── Theme Toggle ──
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = CRMStore.getTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      CRMStore.setTheme(next);
      applyTheme(next);
      updateThemeIcon(next);
    });
  }

  // ── Unified Search Box ──
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value;
        if (currentActiveView === 'pipeline') {
          KanbanBoard.setSearchQuery(query);
        } else if (currentActiveView === 'contacts') {
          ContactsView.setSearchQuery(query);
        }
      }, 200);
    });
  }

  // ── Add Deal Button ──
  const addDealBtn = document.getElementById('btn-add-deal');
  if (addDealBtn) {
    addDealBtn.addEventListener('click', () => {
      CRMModal.openAdd();
    });
  }

  // ── View Switcher Navigation ──
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const viewTarget = item.dataset.view;
      if (!viewTarget) return;

      switchView(viewTarget);

      // Close mobile sidebar on nav click
      sidebar.classList.remove('mobile-open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
    });
  });

  // ── Initialize Modules ──
  CRMModal.init();

  // ── Fetch deals from Supabase DB & initialize views ──
  await CRMStore.fetchDeals();

  KanbanBoard.init('#kanban-board');
  ContactsView.init('#contacts-container');
  AnalyticsView.init('#analytics-container');
  SettingsView.init('#settings-container');

  // ── Update Icon ──
  updateThemeIcon(CRMStore.getTheme());
}

// ── Switch View Function ──
function switchView(viewName) {
  currentActiveView = viewName;

  // Update Nav Active state
  document.querySelectorAll('.nav-item').forEach(i => {
    if (i.dataset.view === viewName) {
      i.classList.add('active');
    } else {
      i.classList.remove('active');
    }
  });

  // Update View Containers
  document.querySelectorAll('.app-view').forEach(viewEl => {
    if (viewEl.id === `view-${viewName}`) {
      viewEl.classList.add('active');
    } else {
      viewEl.classList.remove('active');
    }
  });

  // Update Topbar Title & Controls
  const pageTitle = document.getElementById('page-title');
  const searchBox = document.getElementById('topbar-search-box');
  const statsChips = document.getElementById('topbar-stats-chips');
  const searchInput = document.getElementById('search-input');

  if (searchInput) searchInput.value = '';

  const titleMap = {
    pipeline: 'Sales Pipeline',
    contacts: 'Contacts Directory',
    analytics: 'CRM Analytics',
    settings: 'Settings & Preferences',
  };

  if (pageTitle) pageTitle.textContent = titleMap[viewName] || 'Sales Pipeline';

  // Toggle search box and stats visibility based on view
  if (viewName === 'pipeline') {
    if (searchBox) searchBox.style.display = 'flex';
    if (statsChips) statsChips.style.display = 'flex';
    KanbanBoard.setSearchQuery('');
    KanbanBoard.render();
  } else if (viewName === 'contacts') {
    if (searchBox) searchBox.style.display = 'flex';
    if (statsChips) statsChips.style.display = 'none';
    ContactsView.setSearchQuery('');
    ContactsView.render();
  } else if (viewName === 'analytics') {
    if (searchBox) searchBox.style.display = 'none';
    if (statsChips) statsChips.style.display = 'none';
    AnalyticsView.render();
  } else if (viewName === 'settings') {
    if (searchBox) searchBox.style.display = 'none';
    if (statsChips) statsChips.style.display = 'none';
    SettingsView.render();
  }
}

// ── Apply Theme ──
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// ── Update Theme Toggle Icon ──
function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  if (theme === 'dark') {
    themeToggle.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
  } else {
    themeToggle.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }
}
