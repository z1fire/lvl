// dashboard.js — handles dashboard rendering and small animations
(function(){
  function animateXPBar(element, targetWidth){
    try{ if (window.AppUtils && typeof window.AppUtils.animateXPBar === 'function') return window.AppUtils.animateXPBar(element, targetWidth); }catch(e){}
    try{
      const currentWidth = parseFloat(element.style.width) || 0;
      const duration = 700;
      const frameRate = 1000/60;
      const totalFrames = duration / frameRate;
      const delta = targetWidth - currentWidth;
      let frame = 0;
      const easeOutQuad = (t) => t * (2 - t);
      const interval = setInterval(()=>{
        frame++;
        const progress = easeOutQuad(frame/totalFrames);
        const newWidth = currentWidth + delta * progress;
        element.style.width = `${newWidth}%`;
        if (frame >= totalFrames) clearInterval(interval);
      }, frameRate);
    }catch(e){}
  }

  function loadDashboardData(){
    try{
      const user = (typeof Storage !== 'undefined' && Storage.load) ? Storage.load() : null;
      if (!user) return;

      // profile summary
      try{ const nameEl = document.querySelector('[data-user-name]'); if (nameEl) nameEl.textContent = user.name || ''; }catch(e){}
      try{ const initial = document.getElementById('userInitial'); if (initial) initial.textContent = (user.name && user.name.length>0) ? user.name.charAt(0).toUpperCase() : '?'; }catch(e){}

      try{ const totalEl = document.querySelector('[data-total-xp]'); if (totalEl) totalEl.textContent = `${Number(user.totalXP||0).toLocaleString()} XP`; }catch(e){}
      try{ const lvEl = document.querySelector('[data-overall-level]'); if (lvEl) lvEl.textContent = `Overall Lv ${Number(user.overallLevel||0)}`; }catch(e){}
      try{ const progBar = document.getElementById('overallProgressBar'); if (progBar) animateXPBar(progBar, Number(user.overallProgress||0)); }catch(e){}
      try{ const streakEl = document.querySelector('[data-streak]'); if (streakEl) streakEl.textContent = `🔥 ${Number(user.streak||0)}-day streak`; }catch(e){}

      // attributes
      const attrs = user.attributes || {};
      document.querySelectorAll('[data-attr]').forEach(card => {
        try{
          const attr = card.getAttribute('data-attr');
          const data = attrs[attr] || {};
          const levelEl = card.querySelector('[data-level]'); if (levelEl) levelEl.textContent = `Lv ${Number(data.level||0)}`;
          const xpBar = card.querySelector('[data-xp-bar]'); if (xpBar) animateXPBar(xpBar, Number(data.progress||0));
          const xpText = card.querySelector('[data-xp-text]'); if (xpText) xpText.textContent = `${Number(data.xp||0).toLocaleString()} / ${Number(data.nextLevelXp||0).toLocaleString()} XP`;
          // sub-attributes
          if (data.subAttributes) {
            for (const [k,v] of Object.entries(data.subAttributes)){
              const subEl = card.querySelector(`[data-sub='${k}']`);
              if (subEl) subEl.textContent = `${Number(v||0).toLocaleString()} XP`;
            }
          }
        }catch(e){}
      });

    }catch(e){ console.error('loadDashboardData error', e); }
  }

  function showLevelUpBadge(attribute, newLevel){
    try{
      const card = document.querySelector(`[data-attr='${attribute}']`);
      if (!card) return;
      const badge = document.createElement('div'); badge.className = 'levelup-badge fixed top-2 right-3 bg-green-500 text-black px-2 py-1 rounded text-xs font-bold'; badge.textContent = `Lv ${newLevel}`;
      card.appendChild(badge);
      setTimeout(()=>{ try{ badge.remove(); }catch(e){} }, 2200);
    }catch(e){ }
  }

  function wireSubAttributeToggles(){
    try{
      document.querySelectorAll('.toggle-subattr').forEach(btn => {
        if (btn.dataset.wired) return;
        btn.addEventListener('click', () => {
          try{
            const card = btn.closest('[data-attr]'); if (!card) return;
            const sub = card.querySelector('.sub-attr'); if (!sub) return; sub.classList.toggle('hidden');
          }catch(e){}
        });
        btn.dataset.wired = 'true';
      });
    }catch(e){}
  }

  window.Dashboard = { loadDashboardData, animateXPBar, showLevelUpBadge, wireSubAttributeToggles };
})();
/* dashboard.js - dashboard rendering and helpers (loadDashboardData, animateXPBar, level badges) */
(function(){
  function animateXPBar(element, targetWidth) {
    if (!element) return;
    const currentWidth = parseFloat(element.style.width) || 0;
    const duration = 700;
    const frameRate = 1000 / 60;
    const totalFrames = duration / frameRate;
    const delta = targetWidth - currentWidth;
    let frame = 0;
    const easeOutQuad = (t) => t * (2 - t);

    const interval = setInterval(() => {
      frame++;
      const progress = easeOutQuad(frame / totalFrames);
      const newWidth = currentWidth + delta * progress;
      element.style.width = `${newWidth}%`;
      if (frame >= totalFrames) clearInterval(interval);
    }, frameRate);
  }

  function showLevelUpBadge(attribute, newLevel) {
    const attrCard = document.querySelector(`[data-attr='${attribute}']`);
    if (!attrCard) return;
    if (attrCard.querySelector('.level-up-badge')) return;

    const badge = document.createElement('div');
    badge.className = 'level-up-badge';
    badge.innerHTML = `⭐ Level Up! <span class="text-sm text-gray-200">Lv ${newLevel}</span>`;
    attrCard.appendChild(badge);

    attrCard.classList.add('level-up-pulse');
    setTimeout(() => {
      attrCard.classList.remove('level-up-pulse');
      badge.remove();
    }, 1800);
  }

  function wireSubAttributeToggles() {
    const STORAGE_KEY = 'openSubAttrs';
    let openSubAttrs = [];
    try { openSubAttrs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { openSubAttrs = []; }

    document.querySelectorAll('.toggle-subattr').forEach((el) => {
      if (el.dataset.wired === 'true') return;
      el.addEventListener('click', () => {
        try {
          const parent = el.closest('[data-attr]');
          const attr = parent && parent.dataset ? parent.dataset.attr : null;
          const subSection = parent ? parent.querySelector('.sub-attr') : null;
          if (!subSection || !attr) return;
          const isOpen = !subSection.classList.contains('hidden');
          subSection.classList.toggle('hidden');
          if (isOpen) openSubAttrs = openSubAttrs.filter(a => a !== attr);
          else openSubAttrs.push(attr);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(openSubAttrs));
        } catch (err) { /* ignore */ }
      });
      el.dataset.wired = 'true';
    });

    openSubAttrs.forEach(attr => {
      try { const el = document.querySelector(`[data-attr='${attr}'] .sub-attr`); if (el) el.classList.remove('hidden'); } catch (e) {}
    });
  }

  function loadDashboardData(){
    try{
      const user = Storage.load();
      const LAST_LEVELS_KEY = 'lvl_last_seen_levels';
      let lastLevels = {};
      try { lastLevels = JSON.parse(localStorage.getItem(LAST_LEVELS_KEY)) || {}; } catch (e) { lastLevels = {}; }

      document.querySelectorAll('[data-attr]').forEach((el) => {
        const attr = el.dataset.attr;
        const xpBar = el.querySelector('[data-xp-bar]');
        const xpText = el.querySelector('[data-xp-text]');
        const levelText = el.querySelector('[data-level]');
        const attrData = user.attributes[attr];
        if (!attrData) return;

        const nextLevelXP = attrData.level * 200;
        const progress = Math.min((attrData.xp / nextLevelXP) * 100, 100);
        animateXPBar(xpBar, progress);
        if (xpText) xpText.textContent = `${attrData.xp} / ${nextLevelXP} XP`;

        const prevLevel = (lastLevels[attr] !== undefined) ? lastLevels[attr] : parseInt(levelText.dataset.prevLevel || 0);
        if (attrData.level > prevLevel) showLevelUpBadge(attr, attrData.level);
        if (levelText) levelText.dataset.prevLevel = attrData.level;
        lastLevels[attr] = attrData.level;
        if (levelText) levelText.textContent = `Lv ${attrData.level}`;

        if (attrData.sub) {
          for (const [subKey, subXP] of Object.entries(attrData.sub)) {
            const span = el.querySelector(`[data-sub='${subKey}']`);
            if (span) span.textContent = `${subXP} XP`;
          }
        }
      });

      const nameEl = document.querySelector('[data-user-name]');
      const totalXP = document.querySelector('[data-total-xp]');
      const overallEl = document.querySelector('[data-overall-level]');
      const streakEl = document.querySelector('[data-streak]');
      if (nameEl) nameEl.textContent = user.name;
      if (totalXP) totalXP.textContent = `${user.totalXP.toLocaleString()} XP`;
      try{
        if (overallEl && window.Storage && typeof Storage.computeOverallLevel === 'function'){
          const info = Storage.computeOverallLevel(user.totalXP, { baseXP: 1000, growth: 0.05 });
          overallEl.textContent = `Overall Lv ${info.level} — ${info.xpIntoLevel.toLocaleString()} / ${info.xpForNextLevel.toLocaleString()} XP`;
          try{ const bar = document.getElementById('overallProgressBar'); if (bar) { const pct = Math.min(100, Math.round((info.xpIntoLevel / info.xpForNextLevel) * 100)); bar.style.width = pct + '%'; } }catch(e){}
        } else if (overallEl && window.Storage && typeof Storage.getOverallLevel === 'function'){
          overallEl.textContent = `Overall Lv ${Storage.getOverallLevel(user.totalXP)}`;
        }
      }catch(e){}
      if (streakEl) streakEl.textContent = `🔥 ${user.streak}-day streak`;

      wireSubAttributeToggles();
      try { localStorage.setItem(LAST_LEVELS_KEY, JSON.stringify(lastLevels)); } catch (e) { /* ignore */ }
    }catch(e){ console.error('loadDashboardData error', e); }
  }

  window.Dashboard = { loadDashboardData, animateXPBar, showLevelUpBadge, wireSubAttributeToggles };
})();
