// settings-ui.js — wires settings partial controls (sim buttons, advance day, baseline, reset, display name)
(function(){
  function wire(){
    try{
      // Simulation controls removed from settings UI

      // baseline setting removed

      // Test notification removed from settings UI

      // reset progress button
      const resetBtn = document.getElementById('resetProgressBtn');
      if (resetBtn && !resetBtn.dataset.wired) {
        resetBtn.addEventListener('click', () => { if (confirm('Reset all XP and progress? This cannot be undone.')) Storage.reset(); });
        resetBtn.dataset.wired = 'true';
      }

      // display name input in settings
      const displayInput = document.getElementById('displayNameInput');
      const saveNameBtn = document.getElementById('saveDisplayNameBtn');
      if (displayInput && !displayInput.dataset.wired) {
        try{ const user = Storage.load(); displayInput.value = user.name || ''; }catch(e){ displayInput.value = ''; }
        if (saveNameBtn) {
          saveNameBtn.addEventListener('click', () => {
            const val = (displayInput.value || '').trim();
            try{ const u = Storage.load(); u.name = val; Storage.save(u); const nameEl = document.querySelector('[data-user-name]'); if (nameEl) nameEl.textContent = val || ''; const initial = document.getElementById('userInitial'); if (initial) initial.textContent = (val && val.length>0) ? val.charAt(0).toUpperCase() : '?'; if (window.AppUtils && window.AppUtils.showToast) window.AppUtils.showToast('Display name saved'); }catch(e){ if (window.AppUtils && window.AppUtils.showToast) window.AppUtils.showToast('Unable to save name'); }
          });
        }
        displayInput.dataset.wired = 'true';
      }

    }catch(e){ console.error('SettingsUI.wire error', e); }
  }

  window.SettingsUI = { wire };
})();
