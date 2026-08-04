/* ═══════════════════════════════════════════════════════
   CRM Kanban — Supabase Authentication Module
   ═══════════════════════════════════════════════════════ */

const CRMAuth = (() => {
  let supabase = null;
  let currentUser = null;

  // ── Initialize Supabase & Auth State ──
  async function init() {
    // Validate config
    if (!SUPABASE_CONFIG || 
        SUPABASE_CONFIG.url === 'YOUR_SUPABASE_PROJECT_URL' || 
        SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
      showConfigError();
      return;
    }

    // Initialize Supabase client
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

    // Show loading while checking session
    showLoading(true);

    // Check existing session
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      currentUser = session.user;
      showApp();
    } else {
      showAuthScreen();
    }

    showLoading(false);

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        showApp();
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        showAuthScreen();
      }
    });
  }

  // ── Login with Email ──
  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  // ── Login with Google OAuth ──
  async function loginWithGoogle() {
    const redirectUrl = window.location.origin + window.location.pathname;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) throw error;
    return data;
  }

  // ── Register ──
  async function register(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  }

  // ── Logout ──
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // ── Get Current User ──
  function getUser() {
    return currentUser;
  }

  function getUserName() {
    if (!currentUser) return 'User';
    return currentUser.user_metadata?.full_name || 
           currentUser.email?.split('@')[0] || 
           'User';
  }

  function getUserEmail() {
    return currentUser?.email || '';
  }

  // ── Show/Hide Screens ──
  function showApp() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');

    if (authScreen) {
      authScreen.classList.remove('visible');
      authScreen.classList.add('hidden');
    }
    if (appScreen) {
      appScreen.classList.remove('hidden');
      appScreen.classList.add('visible');
    }

    // Update user profile in sidebar
    updateUserProfile();

    // Initialize the app if not already done
    if (typeof initApp === 'function') {
      initApp();
    }
  }

  function showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');

    if (appScreen) {
      appScreen.classList.remove('visible');
      appScreen.classList.add('hidden');
    }
    if (authScreen) {
      authScreen.classList.remove('hidden');
      authScreen.classList.add('visible');
      renderAuthForm();
    }
  }

  function showLoading(show) {
    const loader = document.getElementById('auth-loader');
    if (loader) {
      loader.style.display = show ? 'flex' : 'none';
    }
  }

  // ── Config Error Screen ──
  function showConfigError() {
    const authScreen = document.getElementById('auth-screen');
    if (!authScreen) return;
    
    authScreen.classList.add('visible');
    authScreen.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand">
          <div class="brand-icon" style="background: var(--stage-lost);">!</div>
          <span class="auth-brand-text">Configuration Required</span>
        </div>
        <div class="auth-config-error">
          <p>Please update <code>js/config.js</code> with your Supabase credentials:</p>
          <div class="config-code-block">
            <code>const SUPABASE_CONFIG = {</code><br>
            <code>&nbsp;&nbsp;url: '<span style="color: var(--accent-primary);">your-project-url</span>',</code><br>
            <code>&nbsp;&nbsp;anonKey: '<span style="color: var(--accent-primary);">your-anon-key</span>',</code><br>
            <code>};</code>
          </div>
          <p class="config-hint">Find these in your Supabase Dashboard → Settings → API</p>
        </div>
      </div>
    `;
  }

  // ── Render Auth Form ──
  function renderAuthForm() {
    const authScreen = document.getElementById('auth-screen');
    if (!authScreen) return;

    authScreen.innerHTML = `
      <div class="auth-card">
        <div class="auth-brand">
          <div class="brand-icon">CK</div>
          <span class="auth-brand-text">CRM Kanban</span>
        </div>
        <p class="auth-subtitle">Manage your sales pipeline with ease</p>

        <!-- Google OAuth Button -->
        <button type="button" class="btn-google-login" id="btn-google-login">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div class="auth-divider">
          <span>or email</span>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login" id="tab-login">Sign In</button>
          <button class="auth-tab" data-tab="register" id="tab-register">Create Account</button>
          <div class="auth-tab-slider" id="auth-tab-slider"></div>
        </div>

        <div class="auth-forms">
          <!-- Login Form -->
          <form class="auth-form visible" id="login-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="login-email">Email</label>
              <input class="form-input" type="email" id="login-email" placeholder="you@company.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Password</label>
              <input class="form-input" type="password" id="login-password" placeholder="Enter your password" required autocomplete="current-password">
            </div>
            <div class="auth-error" id="login-error"></div>
            <button type="submit" class="btn btn-primary auth-submit" id="login-btn">
              <span class="btn-text">Sign In</span>
              <span class="btn-spinner" style="display:none;">
                <svg class="spinner-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="32" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="0.8s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/></circle></svg>
              </span>
            </button>
          </form>

          <!-- Register Form -->
          <form class="auth-form" id="register-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="register-name">Full Name</label>
              <input class="form-input" type="text" id="register-name" placeholder="John Doe" required autocomplete="name">
            </div>
            <div class="form-group">
              <label class="form-label" for="register-email">Email</label>
              <input class="form-input" type="email" id="register-email" placeholder="you@company.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label" for="register-password">Password</label>
              <input class="form-input" type="password" id="register-password" placeholder="Min. 6 characters" required autocomplete="new-password">
            </div>
            <div class="form-group">
              <label class="form-label" for="register-confirm">Confirm Password</label>
              <input class="form-input" type="password" id="register-confirm" placeholder="Re-enter password" required autocomplete="new-password">
            </div>
            <div class="auth-error" id="register-error"></div>
            <button type="submit" class="btn btn-primary auth-submit" id="register-btn">
              <span class="btn-text">Create Account</span>
              <span class="btn-spinner" style="display:none;">
                <svg class="spinner-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="32" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="0.8s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/></circle></svg>
              </span>
            </button>
          </form>
        </div>

        <button class="auth-theme-toggle" id="auth-theme-toggle" aria-label="Toggle theme">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </button>
      </div>
    `;

    bindAuthEvents();
  }

  // ── Bind Auth Form Events ──
  function bindAuthEvents() {
    // Google login button
    const googleBtn = document.getElementById('btn-google-login');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        try {
          await loginWithGoogle();
        } catch (err) {
          console.error('Google OAuth error:', err);
          const loginErr = document.getElementById('login-error');
          showAuthError(loginErr, getAuthErrorMessage(err));
        }
      });
    }
    // Tab switching
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const slider = document.getElementById('auth-tab-slider');

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.classList.add('visible');
        registerForm.classList.remove('visible');
        slider.style.transform = 'translateX(0)';
        clearAuthErrors();
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.classList.add('visible');
        loginForm.classList.remove('visible');
        slider.style.transform = 'translateX(100%)';
        clearAuthErrors();
      });
    }

    // Login form submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        if (!email || !password) {
          showAuthError(errorEl, 'Please fill in all fields.');
          return;
        }

        setButtonLoading(btn, true);
        clearAuthErrors();

        try {
          await login(email, password);
        } catch (err) {
          showAuthError(errorEl, getAuthErrorMessage(err));
        } finally {
          setButtonLoading(btn, false);
        }
      });
    }

    // Register form submit
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        const errorEl = document.getElementById('register-error');
        const btn = document.getElementById('register-btn');

        if (!name || !email || !password || !confirm) {
          showAuthError(errorEl, 'Please fill in all fields.');
          return;
        }

        if (password.length < 6) {
          showAuthError(errorEl, 'Password must be at least 6 characters.');
          return;
        }

        if (password !== confirm) {
          showAuthError(errorEl, 'Passwords do not match.');
          return;
        }

        setButtonLoading(btn, true);
        clearAuthErrors();

        try {
          const data = await register(email, password, name);
          // If email confirmation is required, Supabase returns a user but no session
          if (data.user && !data.session) {
            showAuthError(errorEl, 'Check your email to confirm your account, then sign in.');
            errorEl.style.color = 'var(--stage-won)';
            // Switch to login tab
            setTimeout(() => {
              document.getElementById('tab-login')?.click();
            }, 2000);
          }
        } catch (err) {
          showAuthError(errorEl, getAuthErrorMessage(err));
        } finally {
          setButtonLoading(btn, false);
        }
      });
    }

    // Theme toggle on auth screen
    const authThemeToggle = document.getElementById('auth-theme-toggle');
    if (authThemeToggle) {
      authThemeToggle.addEventListener('click', () => {
        const current = CRMStore.getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        CRMStore.setTheme(next);
        applyTheme(next);
        updateAuthThemeIcon(next);
      });
      updateAuthThemeIcon(CRMStore.getTheme());
    }
  }

  // ── Update User Profile in Sidebar ──
  function updateUserProfile() {
    const profileEl = document.getElementById('user-profile');
    if (!profileEl || !currentUser) return;

    const name = getUserName();
    const email = getUserEmail();
    const initials = CRMStore.getInitials(name);
    const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture;

    const avatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" class="user-avatar-img" alt="${escapeHtml(name)}">`
      : `<div class="user-avatar" style="background: ${color}">${initials}</div>`;

    profileEl.innerHTML = `
      <div class="user-profile-info">
        ${avatarHtml}
        <div class="user-details">
          <span class="user-name">${escapeHtml(name)}</span>
          <span class="user-email">${escapeHtml(email)}</span>
        </div>
      </div>
      <button class="user-logout-btn" id="logout-btn" aria-label="Logout" title="Sign out">
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    `;

    // Bind logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await logout();
          if (typeof showToast === 'function') {
            showToast('Signed out successfully', 'info');
          }
        } catch (err) {
          console.error('Logout error:', err);
        }
      });
    }
  }

  // ── UI Helpers ──
  function showAuthError(el, message) {
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
      el.style.color = '';  // reset to default (error color)
    }
  }

  function clearAuthErrors() {
    document.querySelectorAll('.auth-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
      el.style.color = '';
    });
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    if (loading) {
      btn.disabled = true;
      if (text) text.style.display = 'none';
      if (spinner) spinner.style.display = 'inline-flex';
    } else {
      btn.disabled = false;
      if (text) text.style.display = 'inline';
      if (spinner) spinner.style.display = 'none';
    }
  }

  function getAuthErrorMessage(error) {
    const msg = error?.message || 'An unexpected error occurred.';
    // Friendlier messages
    if (msg.includes('Invalid login credentials')) return 'Invalid email or password.';
    if (msg.includes('User already registered')) return 'This email is already registered. Try signing in.';
    if (msg.includes('Email not confirmed')) return 'Please confirm your email address first.';
    if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
    return msg;
  }

  function updateAuthThemeIcon(theme) {
    const toggle = document.getElementById('auth-theme-toggle');
    if (!toggle) return;
    if (theme === 'dark') {
      toggle.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    } else {
      toggle.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Public API ──
  return {
    init,
    login,
    register,
    logout,
    getUser,
    getUserName,
    getUserEmail,
  };
})();
