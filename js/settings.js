/* ═══════════════════════════════════════════════════════
   CRM Kanban — User Settings & Profile Module
   ═══════════════════════════════════════════════════════ */

const SettingsView = (() => {
  let containerEl = null;

  function init(containerSelector) {
    containerEl = document.querySelector(containerSelector);
    if (!containerEl) return;
    render();
  }

  function render() {
    if (!containerEl) return;

    const user = CRMAuth.getUser();
    const currentName = CRMAuth.getUserName();
    const currentEmail = CRMAuth.getUserEmail();
    const currentCurrency = CRMStore.getCurrency();
    const currentTheme = CRMStore.getTheme();

    containerEl.innerHTML = `
      <div class="settings-page">
        
        <!-- Profile Settings Card -->
        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-icon">
              <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div>
              <h3 class="settings-card-title">User Profile</h3>
              <p class="settings-card-subtitle">Manage your personal details and account settings</p>
            </div>
          </div>

          <form id="profile-form" class="settings-form">
            <div class="form-group">
              <label class="form-label" for="settings-name">Full Name</label>
              <input class="form-input" type="text" id="settings-name" value="${escapeAttr(currentName)}" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="settings-email">Email Address</label>
              <input class="form-input" type="email" id="settings-email" value="${escapeAttr(currentEmail)}" required>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-save-profile">Save Profile Changes</button>
          </form>
        </div>

        <!-- Password Change Card -->
        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div>
              <h3 class="settings-card-title">Security & Password</h3>
              <p class="settings-card-subtitle">Update your password to keep your account secure</p>
            </div>
          </div>

          <form id="password-form" class="settings-form">
            <div class="form-group">
              <label class="form-label" for="settings-new-password">New Password</label>
              <input class="form-input" type="password" id="settings-new-password" placeholder="Min. 6 characters" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="settings-confirm-password">Confirm New Password</label>
              <input class="form-input" type="password" id="settings-confirm-password" placeholder="Re-enter new password" required>
            </div>

            <button type="submit" class="btn btn-secondary" id="btn-save-password">Update Password</button>
          </form>
        </div>

        <!-- Regional Preferences Card -->
        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </div>
            <div>
              <h3 class="settings-card-title">Regional Preferences</h3>
              <p class="settings-card-subtitle">Customize currency symbol and display theme</p>
            </div>
          </div>

          <div class="settings-form">
            <div class="form-group">
              <label class="form-label" for="settings-currency">Display Currency</label>
              <select class="form-select" id="settings-currency">
                <option value="USD" ${currentCurrency === 'USD' ? 'selected' : ''}>USD ($) — US Dollar</option>
                <option value="EUR" ${currentCurrency === 'EUR' ? 'selected' : ''}>EUR (€) — Euro</option>
                <option value="GBP" ${currentCurrency === 'GBP' ? 'selected' : ''}>GBP (£) — British Pound</option>
                <option value="IDR" ${currentCurrency === 'IDR' ? 'selected' : ''}>IDR (Rp) — Indonesian Rupiah</option>
                <option value="JPY" ${currentCurrency === 'JPY' ? 'selected' : ''}>JPY (¥) — Japanese Yen</option>
                <option value="CAD" ${currentCurrency === 'CAD' ? 'selected' : ''}>CAD ($) — Canadian Dollar</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="settings-theme">Theme Mode</label>
              <select class="form-select" id="settings-theme">
                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Theme (MoonShine default)</option>
                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Theme</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Save Profile Form
    const profileForm = containerEl.querySelector('#profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('settings-name').value.trim();
        const newEmail = document.getElementById('settings-email').value.trim();
        const saveBtn = document.getElementById('btn-save-profile');

        if (!newName || !newEmail) return;

        saveBtn.disabled = true;

        try {
          const client = window.supabaseClient || window.supabase?.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
          if (client) {
            const { error } = await client.auth.updateUser({
              email: newEmail,
              data: { full_name: newName }
            });
            if (error) throw error;
          }
          showToast('Profile updated successfully!', 'success');
          // Refresh user profile in sidebar
          if (typeof CRMAuth !== 'undefined') CRMAuth.init();
        } catch (err) {
          console.error('Update profile error:', err);
          showToast(err.message || 'Failed to update profile', 'error');
        } finally {
          saveBtn.disabled = false;
        }
      });
    }

    // Save Password Form
    const passwordForm = containerEl.querySelector('#password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = document.getElementById('settings-new-password').value;
        const confirm = document.getElementById('settings-confirm-password').value;
        const saveBtn = document.getElementById('btn-save-password');

        if (pass.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          return;
        }

        if (pass !== confirm) {
          showToast('Passwords do not match', 'error');
          return;
        }

        saveBtn.disabled = true;

        try {
          const client = window.supabaseClient || window.supabase?.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
          if (client) {
            const { error } = await client.auth.updateUser({ password: pass });
            if (error) throw error;
          }
          showToast('Password updated successfully!', 'success');
          document.getElementById('settings-new-password').value = '';
          document.getElementById('settings-confirm-password').value = '';
        } catch (err) {
          console.error('Password update error:', err);
          showToast(err.message || 'Failed to update password', 'error');
        } finally {
          saveBtn.disabled = false;
        }
      });
    }

    // Currency Select Change
    const currencySelect = containerEl.querySelector('#settings-currency');
    if (currencySelect) {
      currencySelect.addEventListener('change', (e) => {
        CRMStore.setCurrency(e.target.value);
        showToast(`Currency changed to ${e.target.value}`, 'success');
      });
    }

    // Theme Select Change
    const themeSelect = containerEl.querySelector('#settings-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const next = e.target.value;
        CRMStore.setTheme(next);
        applyTheme(next);
        updateThemeIcon(next);
        showToast(`Theme changed to ${next}`, 'success');
      });
    }
  }

  function escapeAttr(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  return {
    init,
    render,
  };
})();
