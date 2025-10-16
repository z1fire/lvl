document.addEventListener("DOMContentLoaded", () => {
  console.log("Level Up Life started!");

  // Notifications helpers (top-level so other handlers can call them)
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function updateNotifCount(){
    try{
      const list = (window.Notifs && window.Notifs.list) ? window.Notifs.list() : [];
      const unread = list.filter(n=>!n.read).length;
      const badge = document.getElementById('notifCount');
      if(!badge) return;
      if(unread>0){ badge.textContent = String(unread); badge.classList.remove('hidden'); }
      else badge.classList.add('hidden');
    }catch(e){}
  }

  // Render the notifications list if the notifications partial is present
  function renderNotificationsList(){
    try{
      const listEl = document.getElementById('notificationsList');
      if(!listEl) return;
      listEl.innerHTML = '';
      const nots = (window.Notifs && window.Notifs.list) ? window.Notifs.list() : [];
      if (nots.length===0) { listEl.innerHTML = '<div class="text-gray-400">No notifications</div>'; return; }
      nots.forEach(n => {
        const card = document.createElement('div');
        card.className = 'p-3 bg-gray-900 rounded-lg border border-gray-800 flex flex-col gap-3';
        if(!n.read) card.classList.add('border-green-600');
        const d = new Date(n.ts);
        const header = document.createElement('div');
        header.className = 'flex items-start justify-between gap-3';
        header.innerHTML = `<div class="flex-1"><div class="text-sm ${n.read? 'text-gray-300':'text-gray-100 font-semibold'}">${escapeHtml(n.message)}</div><div class="text-xs text-gray-500 mt-1">${d.toLocaleString()}</div></div>`;
        const controls = document.createElement('div');
        controls.className = 'flex flex-col gap-2';
        const markBtn = document.createElement('button');
        markBtn.className = 'mark-read text-xs text-gray-300 hover:text-green-400';
        markBtn.dataset.id = n.id;
        markBtn.textContent = n.read ? 'Read' : 'Mark read';
        controls.appendChild(markBtn);
        header.appendChild(controls);
        card.appendChild(header);

        // detail area (collapsed by default)
        const detail = document.createElement('div');
        detail.className = 'notif-detail hidden';
        // if meta has perAttribute, render a simple list
        if (n.meta && n.meta.perAttribute) {
          const rows = [];
          for (const [k,v] of Object.entries(n.meta.perAttribute)){
            const pd = (Number(v.before||0) - Number(v.after||0)) || 0;
            rows.push(`<div><strong>${escapeHtml(k)}</strong>: -${Number(pd).toLocaleString()} XP</div>`);
          }
          detail.innerHTML = rows.join('');
        } else {
          detail.innerHTML = '<div class="text-xs text-gray-400">No further details.</div>';
        }
        card.appendChild(detail);

        // toggle detail on header click
        header.addEventListener('click', (ev) => {
          // avoid toggling when clicking mark-read buttons
          if (ev.target && ev.target.classList && ev.target.classList.contains('mark-read')) return;
          detail.classList.toggle('hidden');
        });

        listEl.appendChild(card);
      });

      // wire clear/markAll buttons once
      const clearBtn = document.getElementById('clearNotifs');
      const markAllBtn = document.getElementById('markAllRead');
      if(clearBtn && !clearBtn.dataset.wired){
        clearBtn.addEventListener('click', () => { if(confirm('Clear all notifications?')) { window.Notifs.clear(); }});
        clearBtn.dataset.wired = 'true';
      }
      if(markAllBtn && !markAllBtn.dataset.wired){
        markAllBtn.addEventListener('click', () => { window.Notifs.markAllRead(); });
        markAllBtn.dataset.wired = 'true';
      }

      // wire per-notification mark-read buttons (re-wire every render)
      listEl.querySelectorAll('.mark-read').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.dataset.id; if(!id) return; window.Notifs.markRead(id);
      }));
    }catch(e){ console.error('renderNotificationsList error', e); }
  }

  // show per-attribute delta badges on dashboard attribute cards when a decay notification is present
  function renderDashboardDeltasFromLatestNotif(){
    try{
      if (!(window.Notifs && window.Notifs.list)) return;
      const list = window.Notifs.list();
      // find the most recent decay notification with perAttribute meta
      const decay = list.find(n => n.type === 'decay' && n.meta && n.meta.perAttribute);
      if (!decay) return;
      const per = decay.meta.perAttribute || {};
      for (const [attr, v] of Object.entries(per)){
        const delta = (Number(v.before||0) - Number(v.after||0)) || 0;
        if (delta === 0) continue;
        const card = document.querySelector(`[data-attr='${attr}']`);
        if (!card) continue;
        // remove existing badge
        const existing = card.querySelector('.attr-delta-badge'); if (existing) existing.remove();
        const badge = document.createElement('div');
        badge.className = 'attr-delta-badge attr-delta-fade';
        badge.textContent = `-${delta}`;
        card.style.position = 'relative';
        card.appendChild(badge);
        // remove after animation
        setTimeout(()=>{ badge.remove(); }, 3200);
      }
    }catch(e){ console.error('renderDashboardDeltas error', e); }
  }

  const navButtons = document.querySelectorAll(".nav-btn");
  let currentPage = "dashboard";
  const pageOrder = ["dashboard", "activities", "reflections", "milestones", "settings"];

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("hx-get") || "";
      const page = target.split("/").pop().replace(".html", "");
      const app = document.getElementById("app");
      const currentIndex = pageOrder.indexOf(currentPage);
      const newIndex = pageOrder.indexOf(page);
      app.dataset.direction = newIndex > currentIndex ? "forward" : "back";

      currentPage = page;
      navButtons.forEach(b => b.classList.replace("text-green-400", "text-gray-400"));
      btn.classList.replace("text-gray-400", "text-green-400");
    });
  });

  document.body.addEventListener("htmx:afterSwap", () => {
    const app = document.getElementById("app");
    app.classList.add("translate-x-0");
    if (document.querySelector("[data-user-name]")) {
      loadDashboardData();
      wireActivityButton();
    }
    if (document.getElementById("activitiesList")) loadActivities();
    // update notification badge when content changes
    try { if (typeof updateNotifCount === 'function') updateNotifCount(); } catch(e){}
    // If notifications partial was loaded, populate its list
    if (document.getElementById('notificationsList')) {
      renderNotificationsList();
    }
  });

// Wire settings-sim buttons when settings partial loads
document.body.addEventListener('htmx:afterSwap', () => {
  const gainBtn = document.getElementById('simGainStreak');
  const missBtn = document.getElementById('simMissStreak');
  if (gainBtn && !gainBtn.dataset.wired) {
    gainBtn.addEventListener('click', () => {
      const user = Storage.load();
      user.streak = (user.streak || 0) + 1;
      Storage.save(user);
      Storage.addNotification('streak', `🔥 You hit a ${user.streak}-day streak!`, {streak: user.streak});
      window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
      // small bell pulse
      const bell = document.getElementById('notifBell'); if (bell) { bell.classList.add('xp-flash'); setTimeout(()=>bell.classList.remove('xp-flash'),700); }
    });
    gainBtn.dataset.wired = 'true';
  }
  if (missBtn && !missBtn.dataset.wired) {
    missBtn.addEventListener('click', () => {
      // decrement streak and apply decay using Storage.applyDecay
      const user = Storage.load();
      user.streak = Math.max(0, (user.streak || 0) - 1);
      Storage.save(user);
      const result = Storage.applyDecay(1, 5); // 1 missed day, 5% per day
      Storage.addNotification('miss', `⚠️ You missed your streak. XP reduced by ${result.delta.toLocaleString()} (sim).`, { delta: result.delta, percent: result.percentApplied });
      window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
      const bell = document.getElementById('notifBell'); if (bell) { bell.classList.add('xp-flash'); setTimeout(()=>bell.classList.remove('xp-flash'),700); }
    });
    missBtn.dataset.wired = 'true';
  }
  // Advance simulated day button
  const advBtn = document.getElementById('advanceDayBtn');
  if (advBtn && !advBtn.dataset.wired) {
    advBtn.addEventListener('click', () => {
      try{
        const res = Storage.advanceDays(1, 5);
        if (res && res.applied) {
          const d = res.decayResult;
          const delta = d && d.delta ? d.delta : (res.decayResult && res.decayResult.delta) || 0;
          // Build per-attribute breakdown (only show non-zero deltas)
          const parts = [];
          try{
            for (const [k, v] of Object.entries(d.perAttribute || {})){
              const before = Number(v.before || 0);
              const after = Number(v.after || 0);
              const pd = before - after;
              if (pd !== 0) {
                const name = String(k).charAt(0).toUpperCase() + String(k).slice(1);
                parts.push(`${name} -${Number(pd).toLocaleString()} XP`);
              }
            }
          }catch(e){/* ignore */}
          const breakdown = parts.length ? (' Changes: ' + parts.join('; ')) : '';
          const message = `Day advanced. Missed ${res.missedDays} day(s). XP reduced by ${Number(delta).toLocaleString()}.${breakdown}`;
          Storage.addNotification('decay', message, { delta: delta, days: res.missedDays, perAttribute: d.perAttribute });
          // refresh UI
          window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
          loadDashboardData();
        } else {
          Storage.addNotification('time', `Day advanced. No decay applied.`);
          window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
        }
      }catch(e){ console.error('advance day error', e); }
    });
    advBtn.dataset.wired = 'true';
  }
  // Baseline setter
  const baselineInput = document.getElementById('baselineDaysInput');
  const setBaselineBtn = document.getElementById('setBaselineBtn');
  if (setBaselineBtn && !setBaselineBtn.dataset.wired) {
    setBaselineBtn.addEventListener('click', () => {
      try{
        const days = parseInt(baselineInput.value || '0', 10) || 0;
        const clk = Storage.setClockBaselineDays(days);
        Storage.addNotification('time', `Baseline set: last active ${days} day(s) ago`);
        window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
      }catch(e){ console.error('set baseline error', e); }
    });
    setBaselineBtn.dataset.wired = 'true';
  }
  // Test notification button
  const testBtn = document.getElementById('testNotifBtn');
  if (testBtn && !testBtn.dataset.wired) {
    testBtn.addEventListener('click', () => {
      if (window.Notifs && window.Notifs.add) {
        window.Notifs.add('test', 'This is a test notification');
        window.dispatchEvent(new CustomEvent('lvl:notifs:update'));
      }
    });
    testBtn.dataset.wired = 'true';
  }
});

// Reflections: render and wire when partial present
function renderReflections(){
  try{
    const listEl = document.getElementById('reflectionsList');
    if(!listEl) return;
    const items = Storage.getReflections();
    if(!items || items.length===0){ listEl.innerHTML = '<div class="text-gray-400">No reflections yet. Write one above to start.</div>'; return; }
    listEl.innerHTML = '';
    items.forEach(it => {
      const card = document.createElement('div');
      card.className = 'p-3 bg-gray-900 rounded-lg border border-gray-800 flex flex-col gap-2 reflection-card';
      card.dataset.id = it.id;
      const t = document.createElement('div'); t.className='text-gray-100'; t.textContent = it.text;
      const meta = document.createElement('div'); meta.className='flex items-center justify-between text-xs text-gray-400';
      const tags = document.createElement('div'); tags.className='flex gap-2';
      (it.tags||[]).slice(0,5).forEach(tag => { const s = document.createElement('span'); s.className='inline-block px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-300'; s.textContent = tag; tags.appendChild(s); });
      const right = document.createElement('div');
      const ts = new Date(it.ts || Date.now());
      right.textContent = ts.toLocaleString();
      meta.appendChild(tags); meta.appendChild(right);
      const del = document.createElement('button'); del.className='text-xs text-red-400 hover:text-red-600 self-end delete-reflection'; del.textContent='Delete';
      del.dataset.id = it.id;
      card.appendChild(t); card.appendChild(meta); card.appendChild(del);
      listEl.appendChild(card);
    });
  }catch(e){ console.error('renderReflections', e); }
}
// expose globally for callers that run outside DOMContentLoaded handlers
try { window.renderDashboardDeltasFromLatestNotif = renderDashboardDeltasFromLatestNotif; } catch(e){}

// Wire reflection form when partial swaps include it
document.body.addEventListener('htmx:afterSwap', () => {
  const form = document.getElementById('reflectionForm');
  if (!form) return;
  // avoid double-wiring
  if (form.dataset.wired) { renderReflections(); return; }
  const textIn = document.getElementById('reflectionText');
  const tagsIn = document.getElementById('reflectionTags');
  const addBtn = document.getElementById('addReflectionBtn');

  addBtn.addEventListener('click', () => {
    const txt = (textIn.value || '').trim();
    if (!txt) { showToast('Reflection cannot be blank'); return; }
    const tags = (tagsIn.value || '').split(',').map(s=>s.trim()).filter(Boolean);
    const added = Storage.addReflection(txt, tags);
    // clear inputs and re-render
    textIn.value = '';
    tagsIn.value = '';
    renderReflections();
    showToast('Reflection saved');
    // simple pulse on reflections nav if present
    const nav = document.querySelector(".nav-btn[data-page='reflections']");
    if (nav) { nav.classList.add('bell-pulse'); setTimeout(()=>nav.classList.remove('bell-pulse'),800); }
  });

  // delegated delete handler inside reflections list
  const listEl = document.getElementById('reflectionsList');
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.delete-reflection');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    if (!confirm('Delete this reflection?')) return;
    Storage.removeReflection(id);
    renderReflections();
    showToast('Reflection deleted');
  });

  form.dataset.wired = 'true';
  renderReflections();
});

  // Register service worker for offline caching
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/lvl/sw.js').then(reg => {
        console.log('Service worker registered', reg.scope);

        // If there's an already waiting worker, tell it to activate
        if (reg.waiting) {
          try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch(e){}
        }

        // Listen for updates found (new SW installing)
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              // If there's a controller, then this is an update. Ask it to skip waiting.
              if (navigator.serviceWorker.controller) {
                try { newWorker.postMessage({ type: 'SKIP_WAITING' }); } catch(e){}
              }
            }
          });
        });
      }).catch(err => console.warn('SW register failed', err));

      // When the active service worker controlling this page changes, reload
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('New service worker activated, reloading page to load updated assets.');
        window.location.reload();
      });
    }
  } catch(e) {}

  // Delegated reset handler: catch clicks on reset button even if partial content reloaded
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('#resetProgressBtn');
    if (!btn) return;
    if (confirm('Reset all XP and progress? This cannot be undone.')) Storage.reset();
  });

  if (document.querySelector("[data-user-name]")) {
    loadDashboardData();
    wireActivityButton();
  }
  // notifications: update badge when notifications list changes
    try {
    window.addEventListener('lvl:notifs:update', () => {
      if(typeof updateNotifCount==='function') updateNotifCount();
      // re-render the notifications list immediately if visible
      renderNotificationsList();
      // update dashboard deltas as well
      try { renderDashboardDeltasFromLatestNotif(); } catch(e){}
      // small bell animation when new notifs present
      try{
        const list = (window.Notifs && window.Notifs.list) ? window.Notifs.list() : [];
        const unread = list.filter(n=>!n.read).length;
        const bell = document.getElementById('notifBell');
        if(bell && unread>0){ bell.classList.add('bell-pulse'); setTimeout(()=>bell.classList.remove('bell-pulse'),800); }
      }catch(e){}
    });
    updateNotifCount();
  } catch(e){}

  // show immediate feedback when a notification is added
  try {
    window.addEventListener('lvl:notifs:added', (ev) => {
      try {
        const n = ev && ev.detail ? ev.detail : null;
        if (n && n.message) showToast(n.message);
        const bell = document.getElementById('notifBell'); if (bell) { bell.classList.add('bell-pulse'); setTimeout(()=>bell.classList.remove('bell-pulse'),800); }
        if (typeof updateNotifCount === 'function') updateNotifCount();
      } catch(e) {}
    });
  } catch(e){}
});

function loadDashboardData() {
  const user = Storage.load();
  // track last shown attribute levels in storage to avoid
  // re-triggering level-up animations on ordinary dashboard refreshes
  // persist in localStorage so animations won't replay after a full page reload
  const LAST_LEVELS_KEY = 'lvl_last_seen_levels';
  let lastLevels = {};
  try { lastLevels = JSON.parse(localStorage.getItem(LAST_LEVELS_KEY)) || {}; } catch (e) { lastLevels = {}; }

  document.querySelectorAll("[data-attr]").forEach((el) => {
    const attr = el.dataset.attr;
    const xpBar = el.querySelector("[data-xp-bar]");
    const xpText = el.querySelector("[data-xp-text]");
    const levelText = el.querySelector("[data-level]");
    const attrData = user.attributes[attr];
    if (!attrData) return;

    const nextLevelXP = attrData.level * 200;
    const progress = Math.min((attrData.xp / nextLevelXP) * 100, 100);
    animateXPBar(xpBar, progress);
    xpText.textContent = `${attrData.xp} / ${nextLevelXP} XP`;

  // Prefer session-tracked lastLevels for animation gating. Fall back to
  // dataset.prevLevel if session data unavailable.
  const prevLevel = (lastLevels[attr] !== undefined) ? lastLevels[attr] : parseInt(levelText.dataset.prevLevel || 0);
  if (attrData.level > prevLevel) showLevelUpBadge(attr, attrData.level);
  // update both dataset (for persistent markup) and session store
  levelText.dataset.prevLevel = attrData.level;
  lastLevels[attr] = attrData.level;
    levelText.textContent = `Lv ${attrData.level}`;

    if (attrData.sub) {
      for (const [subKey, subXP] of Object.entries(attrData.sub)) {
        const span = el.querySelector(`[data-sub='${subKey}']`);
        if (span) span.textContent = `${subXP} XP`;
      }
    }
  });

  const nameEl = document.querySelector("[data-user-name]");
  const totalXP = document.querySelector("[data-total-xp]");
  const streakEl = document.querySelector("[data-streak]");
  if (nameEl) nameEl.textContent = user.name;
  if (totalXP) totalXP.textContent = `${user.totalXP.toLocaleString()} XP`;
  if (streakEl) streakEl.textContent = `🔥 ${user.streak}-day streak`;

  wireSubAttributeToggles();

  try { localStorage.setItem(LAST_LEVELS_KEY, JSON.stringify(lastLevels)); } catch (e) { /* ignore */ }
}
// try to show any recent decay deltas (guarded in case an older cached bundle lacks the function)
try { if (typeof renderDashboardDeltasFromLatestNotif === 'function') renderDashboardDeltasFromLatestNotif(); } catch(e) { /* ignore */ }

function animateXPBar(element, targetWidth) {
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
  if (attrCard.querySelector(".level-up-badge")) return;

  const badge = document.createElement("div");
  badge.className = "level-up-badge";
  badge.innerHTML = `⭐ Level Up! <span class="text-sm text-gray-200">Lv ${newLevel}</span>`;
  attrCard.appendChild(badge);

  attrCard.classList.add("level-up-pulse");
  setTimeout(() => {
    attrCard.classList.remove("level-up-pulse");
    badge.remove();
  }, 1800);
}

function wireSubAttributeToggles() {
  const STORAGE_KEY = "openSubAttrs";
  let openSubAttrs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  document.querySelectorAll(".toggle-subattr").forEach((el) => {
    if (el.dataset.wired === 'true') return;
    el.addEventListener("click", () => {
      const parent = el.closest("[data-attr]");
      const attr = parent.dataset.attr;
      const subSection = parent.querySelector(".sub-attr");
      if (!subSection) return;
      const isOpen = !subSection.classList.contains("hidden");
      subSection.classList.toggle("hidden");
      if (isOpen) openSubAttrs = openSubAttrs.filter(a => a !== attr);
      else openSubAttrs.push(attr);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openSubAttrs));
    });
    el.dataset.wired = 'true';
  });

  openSubAttrs.forEach(attr => {
    const el = document.querySelector(`[data-attr='${attr}'] .sub-attr`);
    if (el) el.classList.remove("hidden");
  });
}

// ✅ Activity Browser
function loadActivities() {
  const list = document.getElementById("activitiesList");
  const search = document.getElementById("activitySearch");
  const catContainer = document.getElementById("categoryFilters");
  const tagContainer = document.getElementById("tagFilters");

  // local cache + simple inverted index
  let cache = { activities: [], index: [], categories: [], tags: [] };
  const userFavs = Storage.getCustomActivities();

  // pagination
  const PAGE_SIZE = 6;
  let currentResults = [];
  let currentPage = 0;
  let activeCategory = null;
  let activeTags = new Set();
  let showFavoritesOnly = false;
  const favToggle = document.getElementById('favoritesToggle');

  function buildIndex(activities) {
    cache.activities = activities;
    // Build searchable text using name, tags, category and only the core attribute keys
    // Also compute a global set of sub-attribute keys so we can filter them out of visible tags
    const allSubAttrs = new Set();
    activities.forEach(a => {
      if (!a.attributes) return;
      Object.keys(a.attributes).forEach(core => {
        const subs = a.attributes[core] && a.attributes[core].sub ? Object.keys(a.attributes[core].sub) : [];
        subs.forEach(s => allSubAttrs.add(String(s).toLowerCase()));
      });
    });

    cache.index = activities.map(a => {
      const coreAttrs = a.attributes ? Object.keys(a.attributes).join(' ') : '';
      const text = [a.name, coreAttrs, a.tags.join(' '), a.category].join(' ').toLowerCase();
      return { id: a.id, text };
    });
    cache.categories = [...new Set(activities.map(a => a.category))];
    // filter out any activity tag that is actually a sub-attribute name
    cache.tags = [...new Set(activities.flatMap(a => a.tags).filter(t => !allSubAttrs.has(String(t).toLowerCase())))];
  }

  function renderFilters() {
    catContainer.innerHTML = cache.categories.map(cat => `<button class="cat-btn px-3 py-1 rounded-full bg-gray-800 text-gray-300 hover:bg-green-600 hover:text-white">${cat}</button>`).join('');
    // Hide tag filters to avoid showing many sub-attribute-like chips which clutter the UI
    tagContainer.innerHTML = '';
    // wire filter clicks
    catContainer.querySelectorAll('.cat-btn').forEach(btn => btn.addEventListener('click', () => {
      const cat = btn.textContent;
      if (activeCategory === cat) activeCategory = null; else activeCategory = cat;
      catContainer.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('bg-green-600', b.textContent === activeCategory));
      doSearch();
    }));

    tagContainer.querySelectorAll('.tag-btn').forEach(btn => btn.addEventListener('click', () => {
      const tag = btn.textContent;
      if (activeTags.has(tag)) activeTags.delete(tag); else activeTags.add(tag);
      btn.classList.toggle('bg-green-600', activeTags.has(tag));
      doSearch();
    }));
  }

  function renderPage(reset = true) {
    if (reset) { list.innerHTML = ''; currentPage = 0; }
    const start = currentPage * PAGE_SIZE;
    const chunk = currentResults.slice(start, start + PAGE_SIZE);
    chunk.forEach(act => list.appendChild(activityCard(act)));
    currentPage++;
    // show load more
    const existingLoad = document.getElementById('loadMoreActivities');
    if (existingLoad) existingLoad.remove();
    if (currentPage * PAGE_SIZE < currentResults.length) {
      const btn = document.createElement('button');
      btn.id = 'loadMoreActivities';
      btn.className = 'w-full mt-3 bg-gray-800 text-gray-200 py-2 rounded-lg';
      btn.textContent = 'Load more';
      btn.addEventListener('click', () => renderPage(false));
      list.appendChild(btn);
    }
  }

  function activityCard(act) {
    const isFav = userFavs.includes(act.id);
    const card = document.createElement('div');
    card.className = `p-3 rounded-xl bg-gray-900 border ${isFav ? 'border-green-500' : 'border-gray-800'} shadow-sm flex justify-between items-center`;
    // Show only core attribute names on each card (avoid displaying sub-attributes or many tag chips)
    const coreAttrs = Object.keys(act.attributes || {});
    const tagsText = coreAttrs.join(', ');

    card.innerHTML = `
      <div>
        <p class="text-gray-200 font-medium">${act.name}</p>
        <p class="text-xs text-gray-400">${tagsText}</p>
      </div>
      <button data-activity-id="${act.id}" class="text-sm ${isFav ? 'text-green-400' : 'text-gray-500'} hover:text-green-400">${isFav ? '★' : '☆'}</button>
    `;
    return card;
  }

  function doSearch() {
    const q = (search.value || '').toLowerCase().trim();
    // very small, fast fuzzy: return items where every token in q appears in index text
    const tokens = q.length ? q.split(/\s+/) : [];
    currentResults = cache.activities.filter((a, i) => {
      if (showFavoritesOnly && !userFavs.includes(a.id)) return false;
      if (activeCategory && a.category !== activeCategory) return false;
      if (activeTags.size > 0 && !a.tags.some(t => activeTags.has(t))) return false;
      if (tokens.length === 0) return true;
      const text = cache.index[i].text;
      return tokens.every(tok => text.includes(tok));
    });
    renderPage(true);
  }

  // Debounce helper
  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  // Favorite toggle handling delegated
  list.addEventListener('click', (e) => {
    if (e.target.matches('button[data-activity-id]')) {
      const id = e.target.dataset.activityId;
      if (userFavs.includes(id)) Storage.removeCustomActivity(id);
      else Storage.addCustomActivity(id);
      // refresh favorites cache and re-render current page
      const updatedFavs = Storage.getCustomActivities();
      userFavs.splice(0, userFavs.length, ...updatedFavs);
      doSearch();
    }
  });

  // favorites toggle
  if (favToggle) {
    favToggle.addEventListener('click', () => {
      showFavoritesOnly = !showFavoritesOnly;
      favToggle.classList.toggle('bg-green-600', showFavoritesOnly);
      doSearch();
    });
  }

  // initial fetch + boot
  fetch('data/activities.json').then(r => r.json()).then(activities => {
    buildIndex(activities);
    renderFilters();
    // wire search with debounce
    search.addEventListener('input', debounce(doSearch, 180));
    // initial render
    currentResults = cache.activities.slice();
    renderPage(true);
  });
}


// ✅ Log Activity Modal
function wireActivityButton() {
  const logBtn = document.getElementById("logFitness");
  if (!logBtn) return;
  logBtn.addEventListener("click", () => {
    fetch("partials/activity_form.html")
      .then(res => res.text())
      .then(html => {
        document.body.insertAdjacentHTML("beforeend", html);
        initActivityForm();
      });
  });
}

function initActivityForm() {
  const overlay = document.getElementById("activityFormOverlay");
  const closeBtn = document.getElementById("closeActivityForm");
  const activitySelect = document.getElementById("activitySelect");
  const timeSelect = document.getElementById("timeSelect");
  const xpPreview = document.getElementById("xpPreview");
  const form = document.getElementById("activityForm");

  closeBtn.addEventListener("click", () => overlay.remove());

  fetch("data/activities.json")
    .then(res => res.json())
    .then(activities => {
      const userFavs = Storage.getCustomActivities();
      const filtered = userFavs.length ? activities.filter(a => userFavs.includes(a.id)) : activities;
      activitySelect.innerHTML = "";
      filtered.forEach((act) => {
        const opt = document.createElement("option");
        opt.value = act.id;
        opt.textContent = act.name;
        activitySelect.appendChild(opt);
      });
    });

  // accessibility: ensure selects have labels for screen readers
  if (activitySelect && !activitySelect.hasAttribute('aria-label')) activitySelect.setAttribute('aria-label', 'Select activity');
  if (timeSelect && !timeSelect.hasAttribute('aria-label')) timeSelect.setAttribute('aria-label', 'Time spent in minutes');

  function updateXPPreview() {
    const minutes = parseInt(timeSelect.value, 10);
    const xp = Math.round(minutes * 1.6);
    xpPreview.textContent = xp;
  }

  timeSelect.addEventListener("change", updateXPPreview);
  updateXPPreview();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const activityId = activitySelect.value;
    const minutes = parseInt(timeSelect.value, 10);

    fetch("data/activities.json")
      .then(res => res.json())
      .then(activities => {
        const activityData = activities.find(a => a.id === activityId);
        if (!activityData) return;

        const result = Storage.addWeightedXP(activityData, minutes);
        overlay.remove();

        // Immediately show toast with accurate total
        showToast(`+${result.totalXP} XP from ${activityData.name}!`);

        // If details provided, trigger immediate animations for attributes that leveled up
        try {
          const LAST_LEVELS_KEY = 'lvl_last_seen_levels';
          const lastLevels = JSON.parse(localStorage.getItem(LAST_LEVELS_KEY) || '{}');

          if (result.details && result.details.attributes) {
            for (const [attrKey, d] of Object.entries(result.details.attributes)) {
              // if levels gained, show animation immediately
              if (d.levelsGained && d.levelsGained > 0) {
                showLevelUpBadge(attrKey, d.newLevel);
              }
              // update persisted last seen
              lastLevels[attrKey] = d.newLevel;
            }
            localStorage.setItem(LAST_LEVELS_KEY, JSON.stringify(lastLevels));
          }
        } catch (err) { /* ignore */ }

        // refresh dashboard display (bars, counts)
        loadDashboardData();
      });
  });
}

// Wire settings reset button when settings partial is loaded
document.body.addEventListener('htmx:afterSwap', () => {
  
  const resetBtn = document.getElementById('resetProgressBtn');
  if (resetBtn && !resetBtn.dataset.wired) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all XP and progress? This cannot be undone.')) Storage.reset();
    });
    resetBtn.dataset.wired = 'true';
  }
});

// 🔥 Reset Shortcut
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "r") {
    if (confirm("Reset all XP and progress?")) {
      Storage.reset();
    }
  }
});

// 🪄 Toast helper
function showToast(msg) {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.className = "fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeInOut z-50";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
