/* ═══════════════════════════════════════════════════════
   CRM Kanban — Application Entry Point
   ═══════════════════════════════════════════════════════ */

let appInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
  // ── Initialize Theme (before anything else so auth screen is themed) ──
  applyTheme(CRMStore.getTheme());

  // ── Initialize Auth (this controls what screen to show) ──
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

  // ── Search ──
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        KanbanBoard.setSearchQuery(e.target.value);
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

  // ── Navigation (active state) ──
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      // Close mobile sidebar on nav click
      sidebar.classList.remove('mobile-open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
    });
  });

  // ── Initialize Modules ──
  CRMModal.init();

  // ── Fetch deals from Supabase DB & render ──
  await CRMStore.fetchDeals();
  KanbanBoard.init('#kanban-board');

  // ── Theme icon ──
  updateThemeIcon(CRMStore.getTheme());
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
