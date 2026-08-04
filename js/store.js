/* ═══════════════════════════════════════════════════════
   CRM Kanban — Data Store (Supabase Database + Local Sync)
   ═══════════════════════════════════════════════════════ */

const CRMStore = (() => {
  const STORAGE_KEY = 'crm_kanban_deals';
  const THEME_KEY = 'crm_kanban_theme';
  const SIDEBAR_KEY = 'crm_kanban_sidebar';

  const DEFAULT_STAGES = [
    { id: 'lead',        name: 'Lead',         color: '#6366f1' },
    { id: 'qualified',   name: 'Qualified',    color: '#8b5cf6' },
    { id: 'proposal',    name: 'Proposal',     color: '#ec4899' },
    { id: 'negotiation', name: 'Negotiation',  color: '#f59e0b' },
    { id: 'won',         name: 'Closed Won',   color: '#10b981' },
    { id: 'lost',        name: 'Closed Lost',  color: '#ef4444' },
  ];

  function getStageStorageKey() {
    const user = typeof CRMAuth !== 'undefined' && CRMAuth.getUser ? CRMAuth.getUser() : null;
    return user ? `crm_kanban_stages_${user.id}` : 'crm_kanban_stages_guest';
  }

  function getStages() {
    try {
      const stored = localStorage.getItem(getStageStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error loading custom stages:', e);
    }
    return DEFAULT_STAGES;
  }

  function saveStages(stagesList) {
    try {
      localStorage.setItem(getStageStorageKey(), JSON.stringify(stagesList));
      emit('stages:changed', stagesList);
    } catch (e) {
      console.error('Error saving stages:', e);
    }
  }

  function addStage(name, color) {
    const stages = getStages();
    const newStage = {
      id: 'stage_' + Date.now(),
      name: name.trim(),
      color: color || '#6366f1'
    };
    stages.push(newStage);
    saveStages(stages);
    return newStage;
  }

  function updateStage(stageId, { name, color }) {
    const stages = getStages();
    const idx = stages.findIndex(s => s.id === stageId);
    if (idx !== -1) {
      if (name !== undefined) stages[idx].name = name.trim();
      if (color !== undefined) stages[idx].color = color;
      saveStages(stages);
    }
  }

  function deleteStage(stageId) {
    let stages = getStages();
    if (stages.length <= 1) {
      throw new Error('You must keep at least one stage column.');
    }
    const remainingStages = stages.filter(s => s.id !== stageId);
    const fallbackStageId = remainingStages[0].id;

    // Move any deals in deleted stage to fallback stage
    deals.forEach(deal => {
      if (deal.stage === stageId) {
        moveDeal(deal.id, fallbackStageId);
      }
    });

    saveStages(remainingStages);
  }

  const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

  // In-memory deals cache
  let deals = [];
  let isSupabaseConnected = false;

  // ── Event emitter ──
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(cb => cb(data));
  }

  // ── Data Mapping Helpers (DB <-> JS) ──
  function mapDbToDeal(row) {
    return {
      id: row.id,
      title: row.title,
      contactName: row.contact_name || '',
      company: row.company || '',
      email: row.email || '',
      phone: row.phone || '',
      value: parseFloat(row.value) || 0,
      priority: row.priority || 'medium',
      stage: row.stage || 'lead',
      notes: row.notes || '',
      createdAt: row.created_at,
      stageEnteredAt: row.stage_entered_at || row.created_at,
    };
  }

  function mapDealToDb(deal, userId) {
    const dbRow = {
      id: deal.id,
      title: deal.title,
      contact_name: deal.contactName,
      company: deal.company,
      email: deal.email,
      phone: deal.phone,
      value: deal.value,
      priority: deal.priority,
      stage: deal.stage,
      notes: deal.notes,
      created_at: deal.createdAt,
      stage_entered_at: deal.stageEnteredAt,
    };
    if (userId) dbRow.user_id = userId;
    return dbRow;
  }

  // ── Fetch Deals from Supabase ──
  async function fetchDeals() {
    const client = window.supabaseClient || (typeof CRMAuth !== 'undefined' && CRMAuth.getUser ? window.supabase?.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey) : null);
    const user = CRMAuth ? CRMAuth.getUser() : null;

    if (!user || !client) {
      deals = loadLocalDeals() || [];
      saveLocalDeals(deals);
      emit('deals:changed');
      return deals;
    }

    try {
      const { data, error } = await client
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error (table missing or RLS issue). Falling back to local storage:', error.message);
        isSupabaseConnected = false;
        deals = loadLocalDeals() || [];
      } else {
        isSupabaseConnected = true;
        deals = data ? data.map(mapDbToDeal) : [];
      }
    } catch (err) {
      console.warn('Database error:', err);
      isSupabaseConnected = false;
      deals = loadLocalDeals() || [];
    }

    saveLocalDeals(deals);
    emit('deals:changed');
    return deals;
  }

  // ── Local Fallback Persistence ──
  function loadLocalDeals() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function saveLocalDeals(dealsData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dealsData));
    } catch (e) {
      console.error(e);
    }
  }

  // ── Deal CRUD Operations ──
  function getAllDeals() {
    return [...deals];
  }

  function getDealsByStage(stageId) {
    return deals.filter(d => d.stage === stageId);
  }

  function getDealById(id) {
    return deals.find(d => d.id === id) || null;
  }

  async function addDeal(dealData) {
    const deal = {
      id: generateId(),
      title: dealData.title,
      contactName: dealData.contactName,
      company: dealData.company || '',
      email: dealData.email || '',
      phone: dealData.phone || '',
      value: parseFloat(dealData.value) || 0,
      priority: dealData.priority || 'medium',
      stage: dealData.stage || 'lead',
      notes: dealData.notes || '',
      createdAt: new Date().toISOString(),
      stageEnteredAt: new Date().toISOString(),
    };

    deals.push(deal);
    saveLocalDeals(deals);

    // Save to Supabase if connected
    const client = getSupabaseClient();
    const user = CRMAuth ? CRMAuth.getUser() : null;

    if (client && user) {
      const dbRow = mapDealToDb(deal, user.id);
      const { error } = await client.from('deals').insert([dbRow]);
      if (error) {
        console.error('Failed to insert deal into Supabase:', error.message);
        if (typeof showToast === 'function') {
          showToast('Failed to sync to database: ' + error.message, 'error');
        }
      }
    }

    emit('deal:added', deal);
    emit('deals:changed');
    return deal;
  }

  async function updateDeal(id, updates) {
    const idx = deals.findIndex(d => d.id === id);
    if (idx === -1) return null;

    const oldDeal = { ...deals[idx] };

    // Track stage change
    if (updates.stage && updates.stage !== oldDeal.stage) {
      updates.stageEnteredAt = new Date().toISOString();
    }

    deals[idx] = { ...deals[idx], ...updates };
    saveLocalDeals(deals);

    // Update in Supabase
    const client = getSupabaseClient();
    if (client) {
      const dbRow = mapDealToDb(deals[idx]);
      delete dbRow.user_id; // don't mutate user_id

      const { error } = await client
        .from('deals')
        .update(dbRow)
        .eq('id', id);

      if (error) {
        console.error('Failed to update deal in Supabase:', error.message);
      }
    }

    emit('deal:updated', { deal: deals[idx], oldDeal });
    emit('deals:changed');
    return deals[idx];
  }

  async function deleteDeal(id) {
    const idx = deals.findIndex(d => d.id === id);
    if (idx === -1) return false;

    const removed = deals.splice(idx, 1)[0];
    saveLocalDeals(deals);

    // Delete in Supabase
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete deal in Supabase:', error.message);
      }
    }

    emit('deal:deleted', removed);
    emit('deals:changed');
    return true;
  }

  async function moveDeal(dealId, newStage) {
    return await updateDeal(dealId, { stage: newStage });
  }

  // ── Helper: Get Supabase Client ──
  function getSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase && SUPABASE_CONFIG?.url !== 'YOUR_SUPABASE_PROJECT_URL') {
      window.supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      return window.supabaseClient;
    }
    return null;
  }

  // ── Stats ──
  function getStats() {
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
    const stageStats = {};
    getStages().forEach(s => {
      const stageDeals = deals.filter(d => d.stage === s.id);
      stageStats[s.id] = {
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      };
    });
    return { totalDeals, totalValue, stageStats };
  }

  // ── Theme ──
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    emit('theme:changed', theme);
  }

  // ── Sidebar ──
  function getSidebarState() {
    return localStorage.getItem(SIDEBAR_KEY) || 'expanded';
  }

  function setSidebarState(state) {
    localStorage.setItem(SIDEBAR_KEY, state);
  }

  // ── Helpers ──
  function generateId() {
    return 'deal_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getDaysInStage(deal) {
    const entered = new Date(deal.stageEnteredAt || deal.createdAt);
    const now = new Date();
    return Math.floor((now - entered) / (1000 * 60 * 60 * 24));
  }

  const CURRENCY_KEY = 'crm_kanban_currency';

  function getCurrency() {
    return localStorage.getItem(CURRENCY_KEY) || 'USD';
  }

  function setCurrency(currency) {
    localStorage.setItem(CURRENCY_KEY, currency);
    emit('currency:changed', currency);
    emit('deals:changed');
  }

  function formatCurrency(value) {
    const currency = getCurrency();
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return '$' + Math.round(value).toLocaleString();
    }
  }

  function getInitials(name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function getAvatarColor(name) {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
      '#f97316', '#a855f7', '#06b6d4', '#84cc16',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // ── Seed Data Generator ──
  function generateSeedData() {
    const now = new Date();
    const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

    return [
      {
        id: generateId(),
        title: 'Enterprise SaaS License',
        contactName: 'Sarah Chen',
        company: 'TechNova Inc.',
        email: 'sarah@technova.com',
        phone: '+1 555-0142',
        value: 48000,
        priority: 'high',
        stage: 'negotiation',
        notes: 'Final pricing discussion scheduled for next week.',
        createdAt: daysAgo(21),
        stageEnteredAt: daysAgo(3),
      },
      {
        id: generateId(),
        title: 'Cloud Migration Package',
        contactName: 'Marcus Johnson',
        company: 'DataFlow Systems',
        email: 'marcus@dataflow.io',
        phone: '+1 555-0198',
        value: 125000,
        priority: 'urgent',
        stage: 'proposal',
        notes: 'Proposal sent. Awaiting feedback from CTO.',
        createdAt: daysAgo(14),
        stageEnteredAt: daysAgo(5),
      },
      {
        id: generateId(),
        title: 'Annual Support Contract',
        contactName: 'Emily Rodriguez',
        company: 'GreenLeaf Corp',
        email: 'emily.r@greenleaf.com',
        phone: '+1 555-0167',
        value: 18500,
        priority: 'medium',
        stage: 'qualified',
        notes: 'Budget approved. Need to schedule demo.',
        createdAt: daysAgo(7),
        stageEnteredAt: daysAgo(4),
      },
      {
        id: generateId(),
        title: 'API Integration Project',
        contactName: 'David Kim',
        company: 'NextGen Labs',
        email: 'dkim@nextgenlabs.com',
        phone: '+1 555-0234',
        value: 35000,
        priority: 'high',
        stage: 'lead',
        notes: 'Initial contact through website form.',
        createdAt: daysAgo(2),
        stageEnteredAt: daysAgo(2),
      },
      {
        id: generateId(),
        title: 'Security Audit Suite',
        contactName: 'Aisha Patel',
        company: 'SecureVault',
        email: 'aisha@securevault.io',
        phone: '+1 555-0312',
        value: 72000,
        priority: 'high',
        stage: 'won',
        notes: 'Signed! Onboarding starts next Monday.',
        createdAt: daysAgo(30),
        stageEnteredAt: daysAgo(1),
      },
      {
        id: generateId(),
        title: 'Marketing Analytics Tool',
        contactName: 'James O\'Brien',
        company: 'BrightSpark Media',
        email: 'james@brightspark.co',
        phone: '+1 555-0445',
        value: 22000,
        priority: 'low',
        stage: 'lead',
        notes: 'Referred by existing client. Needs follow-up.',
        createdAt: daysAgo(1),
        stageEnteredAt: daysAgo(1),
      },
    ];
  }

  // ── Public API ──
  return {
    get STAGES() { return getStages(); },
    getStages,
    addStage,
    updateStage,
    deleteStage,
    PRIORITIES,
    on,
    fetchDeals,
    getAllDeals,
    getDealsByStage,
    getDealById,
    addDeal,
    updateDeal,
    deleteDeal,
    moveDeal,
    getStats,
    getTheme,
    setTheme,
    getCurrency,
    setCurrency,
    getSidebarState,
    setSidebarState,
    getDaysInStage,
    formatCurrency,
    getInitials,
    getAvatarColor,
  };
})();
