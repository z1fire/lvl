// settings-ui.js — wires settings partial controls (sim buttons, advance day, baseline, reset, display name)
(function(){
  function wire(){
    try{
      // sim gain / miss
      const gainBtn = document.getElementById('simGainStreak');
      const missBtn = document.getElementById('simMissStreak');
      if (gainBtn && !gainBtn.dataset.wired) {
        gainBtn.addEventListener('click', () => {
          try{
            const user = Storage.load(); user.streak = (user.streak || 0) + 1; Storage.save(user);
            Storage.addNotification('streak', `🔥 You hit a ${user.streak}-day streak!`, {streak: user.streak});
            window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
            const bell = document.getElementById('notifBell'); if (bell) { bell.classList.add('xp-flash'); setTimeout(()=>bell.classList.remove('xp-flash'),700); }
          }catch(e){}
        });
        gainBtn.dataset.wired = 'true';
      }
      if (missBtn && !missBtn.dataset.wired) {
        missBtn.addEventListener('click', () => {
          try{
            const user = Storage.load(); user.streak = Math.max(0, (user.streak || 0) - 1); Storage.save(user);
            const result = Storage.applyDecay(1, 5);
            Storage.addNotification('miss', `⚠️ You missed your streak. XP reduced by ${result.delta.toLocaleString()} (sim).`, { delta: result.delta, percent: result.percentApplied });
            window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
            const bell = document.getElementById('notifBell'); if (bell) { bell.classList.add('xp-flash'); setTimeout(()=>bell.classList.remove('xp-flash'),700); }
          }catch(e){}
        });
        missBtn.dataset.wired = 'true';
      }

      // advance day
      const advBtn = document.getElementById('advanceDayBtn');
      if (advBtn && !advBtn.dataset.wired) {
        advBtn.addEventListener('click', () => {
          try{
            const res = Storage.advanceDays(1, 5);
            if (res && res.applied) {
              const d = res.decayResult; const delta = d && d.delta ? d.delta : (res.decayResult && res.decayResult.delta) || 0;
              const parts = [];
              try{ for (const [k, v] of Object.entries(d.perAttribute || {})){ const before = Number(v.before || 0); const after = Number(v.after || 0); const pd = before - after; if (pd !== 0){ const name = String(k).charAt(0).toUpperCase() + String(k).slice(1); parts.push(`${name} -${Number(pd).toLocaleString()} XP`); } } }catch(e){}
              const breakdown = parts.length ? (' Changes: ' + parts.join('; ')) : '';
              const message = `Day advanced. Missed ${res.missedDays} day(s). XP reduced by ${Number(delta).toLocaleString()}.${breakdown}`;
              Storage.addNotification('decay', message, { delta: delta, days: res.missedDays, perAttribute: d.perAttribute });
              window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
              try{ if (window.Dashboard && typeof window.Dashboard.loadDashboardData === 'function') window.Dashboard.loadDashboardData(); }catch(e){}
            } else {
              Storage.addNotification('time', `Day advanced. No decay applied.`); window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
            }
          }catch(e){ console.error('advance day error', e); }
        });
        advBtn.dataset.wired = 'true';
      }

      // baseline setter
      const baselineInput = document.getElementById('baselineDaysInput');
      const setBaselineBtn = document.getElementById('setBaselineBtn');
      if (setBaselineBtn && !setBaselineBtn.dataset.wired) {
        setBaselineBtn.addEventListener('click', () => {
          try{ const days = parseInt(baselineInput.value || '0', 10) || 0; const clk = Storage.setClockBaselineDays(days); Storage.addNotification('time', `Baseline set: last active ${days} day(s) ago`); window.dispatchEvent(new CustomEvent('lvl:notifs:update')); }catch(e){ console.error('set baseline error', e); }
        });
        setBaselineBtn.dataset.wired = 'true';
      }

      // test notification
      const testBtn = document.getElementById('testNotifBtn');
      if (testBtn && !testBtn.dataset.wired) {
        testBtn.addEventListener('click', () => {
          try{
            if (window.Notifs && window.Notifs.add) {
              window.Notifs.add('test', 'This is a test notification');
              window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
            } else {
              // fallback: localStorage-only quick notify + toast
              try{ const tmsg = 'This is a test notification (fallback)'; if (window.AppUtils && window.AppUtils.showToast) window.AppUtils.showToast(tmsg); else { const d = document.createElement('div'); d.textContent = tmsg; d.className='fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeInOut z-50'; document.body.appendChild(d); setTimeout(()=>d.remove(),2500);} }catch(e){}
            }
          }catch(e){}
        });
        testBtn.dataset.wired = 'true';
      }

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
