// activity-form.js — encapsulate the Log Activity modal and form wiring
(function(){
  function init() {
    const overlay = document.getElementById("activityFormOverlay");
    const closeBtn = document.getElementById("closeActivityForm");
    const activitySelect = document.getElementById("activitySelect");
    const timeSelect = document.getElementById("timeSelect");
    const xpPreview = document.getElementById("xpPreview");
    const form = document.getElementById("activityForm");
    if (!form) return;

    if (closeBtn) closeBtn.addEventListener("click", () => overlay && overlay.remove());

    fetch("data/activities.json").then(r=>r.json()).then(activities => {
      try{
        const userFavs = (window.Storage && typeof Storage.getCustomActivities === 'function') ? Storage.getCustomActivities() : [];
        const filtered = userFavs.length ? activities.filter(a => userFavs.includes(a.id)) : activities;
        if (activitySelect) {
          activitySelect.innerHTML = "";
          filtered.forEach((act) => {
            const opt = document.createElement("option");
            opt.value = act.id; opt.textContent = act.name; activitySelect.appendChild(opt);
          });
        }
      }catch(e){ console.error('activity form populate error', e); }
    }).catch(e=>console.error('fetch activities failed', e));

    if (activitySelect && !activitySelect.hasAttribute('aria-label')) activitySelect.setAttribute('aria-label', 'Select activity');
    if (timeSelect && !timeSelect.hasAttribute('aria-label')) timeSelect.setAttribute('aria-label', 'Time spent in minutes');

    function updateXPPreview() {
      try{
        const minutes = parseInt(timeSelect.value, 10) || 0;
        const xp = Math.round(minutes * 1.6);
        if (xpPreview) xpPreview.textContent = xp;
      }catch(e){}
    }

    if (timeSelect) timeSelect.addEventListener('change', updateXPPreview);
    updateXPPreview();

    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      try{
        const activityId = activitySelect && activitySelect.value;
        const minutes = parseInt(timeSelect && timeSelect.value, 10) || 0;
          const detailsField = document.getElementById('activityDetails');
          const details = detailsField ? String(detailsField.value || '').trim() : '';
        fetch('data/activities.json').then(r=>r.json()).then(activities => {
          const activityData = activities.find(a => a.id === activityId);
          if (!activityData) return;
          const result = (window.Storage && typeof Storage.addWeightedXP === 'function') ? Storage.addWeightedXP(activityData, minutes) : { totalXP: 0 };
          // Append to activity history (safe, optionally present)
          try{
              const entry = { activityName: activityData.name, minutes: minutes, details: details, ts: Date.now() };
            if (window.Storage && typeof Storage.addActivityHistory === 'function') {
              try { Storage.addActivityHistory(entry); } catch(e){ console.error('Storage.addActivityHistory threw', e); }
            } else {
              // Fallback: write directly to localStorage to be resilient to stale/cached bundles
              try {
                const key = 'lvl_activity_history_v1';
                const raw = localStorage.getItem(key);
                const list = raw ? JSON.parse(raw) : [];
                list.push(Object.assign({ id: 'h_' + Date.now() + '_' + Math.floor(Math.random()*1000) }, entry));
                localStorage.setItem(key, JSON.stringify(list));
              } catch (e) { console.error('fallback history write failed', e); }
            }
            // If the history view is currently open, refresh it so the new entry appears
            try { if (window.History && typeof window.History.wire === 'function') window.History.wire(); } catch(e){}
          }catch(e){ console.error('failed to write activity history', e); }

          overlay && overlay.remove();
          try{ if (window.AppUtils && window.AppUtils.showToast) window.AppUtils.showToast(`+${result.totalXP} XP from ${activityData.name}!`); else if (window.showToast) showToast(`+${result.totalXP} XP from ${activityData.name}!`); }catch(e){}
          try{ if (typeof window.loadDashboardData === 'function') window.loadDashboardData(); }catch(e){}
        });
      }catch(e){ console.error('submit activity error', e); }
    });
  }

  window.ActivityForm = { init };
})();
