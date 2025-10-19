document.addEventListener("DOMContentLoaded", () => {
  console.log("Level Up Life started!");

  // restore update timestamp (set by SW UI) so HTMX cache-busting can run immediately
  try {
    const uts = sessionStorage.getItem('lvl_update_ts');
    if (uts) window.__LVL_update_ts = String(uts);
  } catch (e) {}

  // PWA install prompt handling
  let deferredPrompt = null;
  const installBtn = document.getElementById('installPWA');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    try { window.deferredPrompt = e; } catch(err) {}
    console.log('beforeinstallprompt event fired', e);
    if (installBtn) { installBtn.classList.remove('hidden'); installBtn.addEventListener('click', async () => {
      try{ deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; if (choice && choice.outcome === 'accepted') { showToast('App installed'); } deferredPrompt = null; installBtn.classList.add('hidden'); }catch(e){}
    }); }
  });

  // Delegate notifications UI work to NotifsUI when available
  const updateNotifCount = function(){ try{ if (window.NotifsUI && typeof window.NotifsUI.updateNotifCount === 'function') return window.NotifsUI.updateNotifCount(); }catch(e){} };
  function renderNotificationsList(){ try{ if (window.NotifsUI && typeof window.NotifsUI.renderNotificationsList === 'function') return window.NotifsUI.renderNotificationsList(); }catch(e){} }
  function renderDashboardDeltasFromLatestNotif(){ try{ if (window.NotifsUI && typeof window.NotifsUI.renderDashboardDeltasFromLatestNotif === 'function') return window.NotifsUI.renderDashboardDeltasFromLatestNotif(); }catch(e){} }

  // Name UI (inline edit & first-run prompt) delegated to js/name-ui.js -> window.NameUI

  const navButtons = document.querySelectorAll(".nav-btn");
  let currentPage = "dashboard";
  const pageOrder = ["dashboard", "activities", "reflections", "milestones"];

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

      // If user clicks Home while already on Dashboard, ensure dashboard visuals refresh.
      try{
        if (page === 'dashboard' && window.Dashboard && typeof window.Dashboard.loadDashboardData === 'function') {
          // schedule after any potential HTMX swap to avoid racing with incoming HTML
          setTimeout(() => { try{ window.Dashboard.loadDashboardData(); }catch(e){} }, 80);
        }
      }catch(e){}
    });
  });

  // Helper: read File to DataURL
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ''));
      fr.onerror = () => reject(new Error('Failed to read file'));
      fr.readAsDataURL(file);
    });
  }

  // Helper: get approximate byte size from data URL
  function dataURLSizeBytes(dataUrl) {
    // remove prefix like data:image/jpeg;base64,
    const idx = dataUrl.indexOf(',');
    if (idx === -1) return dataUrl.length;
    const base64 = dataUrl.slice(idx + 1);
    // Each base64 character encodes 6 bits => bytes = base64.length * 3/4
    return Math.ceil((base64.length * 3) / 4);
  }

  // Resize image (via canvas) and try quality reductions to hit size target
  async function readAndResizeImage(file, maxWidth = 512, maxKB = 300) {
    if (!file || !file.type || !file.type.startsWith('image/')) throw 'Selected file is not an image';
    const initialDataUrl = await readFileAsDataURL(file);
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Invalid image file'));
      i.src = initialDataUrl;
    });

    // compute target dimensions
    let targetWidth = img.width;
    let targetHeight = img.height;
    if (img.width > maxWidth) {
      const ratio = maxWidth / img.width;
      targetWidth = Math.round(img.width * ratio);
      targetHeight = Math.round(img.height * ratio);
    }

    // helper to render at given width/quality
    function renderToDataUrl(width, height, quality) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', quality);
    }

    // Try descending qualities, and if still too big, scale down and retry
    const maxBytes = maxKB * 1024;
    let width = targetWidth, height = targetHeight;
    for (let scaleAttempts = 0; scaleAttempts < 6; scaleAttempts++) {
      for (let q = 0.92; q >= 0.5; q -= 0.08) {
        try {
          const out = renderToDataUrl(width, height, q);
          const size = dataURLSizeBytes(out);
          if (size <= maxBytes) return out;
          // if image already small (file bytes), and conversion made it bigger, keep original as fallback
        } catch (e) { /* ignore and continue */ }
      }
      // reduce dimensions by 0.8 and retry
      width = Math.max(64, Math.round(width * 0.8));
      height = Math.max(64, Math.round(height * 0.8));
    }

    // final attempt: return a reasonable JPEG even if slightly larger
    const fallback = renderToDataUrl(Math.max(64, width), Math.max(64, height), 0.5);
    if (dataURLSizeBytes(fallback) <= maxBytes * 1.5) return fallback;
    throw 'Image could not be compressed below ' + maxKB + 'KB';
  }

  // Cache-busting for reflections partial: ensure we fetch latest partial from network
  document.body.addEventListener('click', (e) => {
    try {
      const btn = e.target.closest && e.target.closest('.nav-btn');
      if (!btn) return;
      const hx = btn.getAttribute && btn.getAttribute('hx-get');
      if (!hx) return;
      if (hx.indexOf('reflections.html') !== -1) {
        // append timestamp to force network fetch (bypass cached entries)
        const sep = hx.indexOf('?') === -1 ? '?' : '&';
        btn.setAttribute('hx-get', hx + sep + 'cb=' + Date.now());
      }
    } catch (e) { /* ignore */ }
  }, true);

  // HTMX: when an update timestamp is present, append it to all GET requests to bypass caches
  document.body.addEventListener('htmx:configRequest', (evt) => {
    try {
      const ts = window.__LVL_update_ts;
      if (!ts) return;
      const cfg = evt.detail || {};
      const verb = (cfg.verb || 'GET').toUpperCase();
      if (verb !== 'GET') return;
      const path = cfg.path || cfg.pathInfo || null;
      if (!path) return;
      if (path.indexOf('?') === -1) cfg.path = path + '?_ts=' + ts;
      else cfg.path = path + '&_ts=' + ts;
    } catch (e) {
      console.warn('htmx cache-bust hook error', e);
    }
  });

  document.body.addEventListener("htmx:afterSwap", () => {
    const app = document.getElementById("app");
    app.classList.add("translate-x-0");
    if (document.querySelector("[data-user-name]")) {
      loadDashboardData();
      wireActivityButton();
      try { wireReflectButton(); } catch(e) {}
  // wire inline name edit for dashboard (delegated)
  try{ if (window.NameUI && typeof window.NameUI.enableInlineNameEdit === 'function') window.NameUI.enableInlineNameEdit(); }catch(e){}
  try{ const u = Storage.load(); if (!u.name || u.name.trim()==='') { if (window.NameUI && typeof window.NameUI.showNamePromptModal === 'function') window.NameUI.showNamePromptModal(); } }catch(e){}
    }
    if (document.getElementById("activitiesList")) loadActivities();
    // If activity history partial was loaded, wire its UI
    if (document.getElementById('activityHistoryList')) {
      try { if (window.History && typeof window.History.wire === 'function') window.History.wire(); } catch(e){}
    }
    // If leaderboard partial loaded, wire it
    if (document.getElementById('leaderboardList')) {
      try { if (window.Leaderboard && typeof window.Leaderboard.wire === 'function') window.Leaderboard.wire(); } catch(e){}
    }
    // Wire settings partial when present
    if (document.getElementById('settingsPage') || document.getElementById('settingsContainer')) {
      try { if (window.SettingsUI && typeof window.SettingsUI.wire === 'function') window.SettingsUI.wire(); } catch(e){}
      // wire profile image controls inside settings
      try{
        const imgInput = document.getElementById('settingsProfileImageInput');
        const removeBtn = document.getElementById('settingsRemoveProfileImageBtn');
        if (imgInput && !imgInput.dataset.wired) {
          imgInput.addEventListener('change', async (ev) => {
            const f = ev.target.files && ev.target.files[0]; if (!f) return;
            try {
              showToast('Processing image...');
              const resized = await readAndResizeImage(f, 512, 300);
              Storage.setProfileImage(String(resized || ''));
              refreshAvatarUI();
              showToast('Profile image saved');
            } catch (err) {
              console.warn('Image save/resize error', err);
              showToast(typeof err === 'string' ? err : 'Unable to save image');
            }
          });
          imgInput.dataset.wired = 'true';
        }
        if (removeBtn && !removeBtn.dataset.wired) {
          removeBtn.addEventListener('click', ()=>{ if (!confirm('Remove profile picture?')) return; Storage.clearProfileImage(); refreshAvatarUI(); showToast('Profile image removed'); });
          removeBtn.dataset.wired = 'true';
        }
      }catch(e){}
    }
    // update notification badge when content changes
    try { if (typeof updateNotifCount === 'function') updateNotifCount(); } catch(e){}
    // If notifications partial was loaded, populate its list
    if (document.getElementById('notificationsList')) {
      renderNotificationsList();
    }
    // If milestones partial loaded, delegate wiring to Milestones module
    // The milestones partial may no longer include the notification block; check for the chart container too
    if (document.getElementById('milestoneNotify') || document.getElementById('attributesChart')) {
      try { if (window.Milestones && typeof window.Milestones.wire === 'function') window.Milestones.wire(); } catch(e){}
    }
  });

// Settings wiring delegated to SettingsUI
try{ if (window.SettingsUI && typeof window.SettingsUI.wire === 'function') window.SettingsUI.wire(); }catch(e){}

// Reflections: delegated to reflections.js
try { window.renderDashboardDeltasFromLatestNotif = function(){ try{ if (window.NotifsUI && typeof window.NotifsUI.renderDashboardDeltasFromLatestNotif === 'function') return window.NotifsUI.renderDashboardDeltasFromLatestNotif(); }catch(e){} }; } catch(e){ }

// Wire reflections partials after swap
document.body.addEventListener('htmx:afterSwap', () => {
  try{
    if (window.Reflections && typeof window.Reflections.wireForm === 'function') window.Reflections.wireForm();
  }catch(e){}
});

  // Service worker UI delegated to SWUI
  try{ if (window.SWUI && typeof window.SWUI.init === 'function') window.SWUI.init(); if (window.SWUI && typeof window.SWUI.devButtonWire === 'function') window.SWUI.devButtonWire(); }catch(e){}

  // Header update check button
  try{
    const swCheck = document.getElementById('swCheckNow'); if (swCheck) swCheck.addEventListener('click', async ()=>{ try{ if (window.SWUI && typeof window.SWUI.checkForUpdates === 'function') await window.SWUI.checkForUpdates(); }catch(e){} });
  }catch(e){}

  // Profile drawer wiring: open/close, backdrop, sync initial/name
  try{
    const profileBtn = document.getElementById('profileBtn');
    const profileDrawer = document.getElementById('profileDrawer');
    const profileBackdrop = document.getElementById('profileDrawerBackdrop');
    const closeDrawer = document.getElementById('closeProfileDrawer');
    const drawerInitial = document.getElementById('drawerInitial');
    const drawerName = document.getElementById('drawerName');

    function openDrawer(){
      if (!profileDrawer) return;
      profileDrawer.classList.remove('-translate-x-full');
      profileDrawer.setAttribute('aria-hidden','false');
      profileBackdrop.classList.remove('hidden');
      profileBtn.setAttribute('aria-expanded','true');
      // copy initial/name
      try{ const nameEl = document.querySelector('[data-user-name]'); const initialEl = document.getElementById('userInitial'); if (drawerInitial && initialEl) drawerInitial.textContent = initialEl.textContent || '?'; if (drawerName && nameEl) drawerName.textContent = nameEl.textContent || 'Your Name'; }catch(e){}
      // trap focus
      try{ profileDrawer.focus(); }catch(e){}
    }

    function closeDrawerFn(){
      if (!profileDrawer) return;
      profileDrawer.classList.add('-translate-x-full');
      profileDrawer.setAttribute('aria-hidden','true');
      profileBackdrop.classList.add('hidden');
      profileBtn.setAttribute('aria-expanded','false');
      try{ profileBtn.focus(); }catch(e){}
    }

    if (profileBtn) profileBtn.addEventListener('click', (e)=>{ e.preventDefault(); openDrawer(); });
    if (closeDrawer) closeDrawer.addEventListener('click', (e)=>{ e.preventDefault(); closeDrawerFn(); });
    if (profileBackdrop) profileBackdrop.addEventListener('click', (e)=>{ closeDrawerFn(); });
    // close on Escape
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') { try{ if (profileDrawer && !profileDrawer.classList.contains('translate-x-full')) closeDrawerFn(); }catch(err){} } });

    // HTMX links inside drawer should close it after navigation
    document.body.addEventListener('click', (e)=>{
      try{
        const a = e.target.closest && e.target.closest('[hx-get]');
        if (!a) return;
        if (profileDrawer && profileDrawer.contains(a)) {
          // let HTMX handle swap, then close drawer
          setTimeout(()=> closeDrawerFn(), 250);
        }
      }catch(e){}
    }, true);
  }catch(e){}

    // Expose a small helper to refresh avatar UI across header/drawer/settings
    function refreshAvatarUI() {
      try{
        const u = Storage.load();
        const headerInitial = document.getElementById('userInitial');
        if (u && u.profileImage) {
          // header
          if (headerInitial && headerInitial.parentElement) {
            let img = headerInitial.parentElement.querySelector('img');
            if (!img) { img = document.createElement('img'); img.className = 'w-full h-full object-cover rounded-full'; headerInitial.parentElement.appendChild(img); }
            img.src = u.profileImage;
            headerInitial.classList.add('hidden');
          }
        } else {
          if (headerInitial && headerInitial.parentElement) {
            const img = headerInitial.parentElement.querySelector('img'); if (img) img.remove(); headerInitial.classList.remove('hidden');
          }
        }

        // drawer preview
        const drawerAvatarImg = document.getElementById('drawerAvatarImg');
        const drawerInitial = document.getElementById('drawerInitial');
        const removeBtn = document.getElementById('removeProfileImageBtn');
        if (u && u.profileImage) {
          if (drawerAvatarImg) { drawerAvatarImg.src = u.profileImage; drawerAvatarImg.classList.remove('hidden'); }
          if (drawerInitial) drawerInitial.classList.add('hidden');
          if (removeBtn) removeBtn.classList.remove('hidden');
        } else {
          if (drawerAvatarImg) { drawerAvatarImg.src = ''; drawerAvatarImg.classList.add('hidden'); }
          if (drawerInitial) drawerInitial.classList.remove('hidden');
          if (removeBtn) removeBtn.classList.add('hidden');
        }

        // settings preview
        const settingsAvatarImg = document.getElementById('settingsAvatarImg');
        const settingsAvatarInitial = document.getElementById('settingsAvatarInitial');
        const settingsRemoveBtn = document.getElementById('settingsRemoveProfileImageBtn');
        const settingsPreview = document.getElementById('settingsAvatarPreview');
        if (u && u.profileImage) {
          if (settingsAvatarImg) { settingsAvatarImg.src = u.profileImage; settingsAvatarImg.classList.remove('hidden'); }
          if (settingsAvatarInitial) settingsAvatarInitial.classList.add('hidden');
          if (settingsRemoveBtn) settingsRemoveBtn.classList.remove('hidden');
        } else {
          if (settingsAvatarImg) { settingsAvatarImg.src = ''; settingsAvatarImg.classList.add('hidden'); }
          if (settingsAvatarInitial) settingsAvatarInitial.classList.remove('hidden');
          if (settingsRemoveBtn) settingsRemoveBtn.classList.add('hidden');
        }
      }catch(e){ /* ignore */ }
    }

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
  // wire reflect button on dashboard
  try { wireReflectButton(); } catch(e) {}
  // Ensure avatar UI reflects persisted profileImage on load
  try { refreshAvatarUI(); } catch(e) {}
  // expose SW version in header for debugging
  try {
    const swEl = document.getElementById('swVersion');
    if (swEl) { swEl.textContent = 'sw: lvl-static-v2'; swEl.classList.remove('hidden'); }
  } catch(e) {}
  // Notifications wiring delegated to NotifsUI (sets up badge, list render and bell pulses)
  try{ if (window.NotifsUI && typeof window.NotifsUI.wire === 'function') window.NotifsUI.wire(); }catch(e){}
});

function loadDashboardData() {
  if (window.Dashboard && typeof window.Dashboard.loadDashboardData === 'function') return window.Dashboard.loadDashboardData();
  console.warn('Dashboard module not available; falling back to no-op loadDashboardData');
}
// try to show any recent decay deltas (guarded in case an older cached bundle lacks the function)
try { if (typeof renderDashboardDeltasFromLatestNotif === 'function') renderDashboardDeltasFromLatestNotif(); } catch(e) { /* ignore */ }

const animateXPBar = (window.Dashboard && typeof window.Dashboard.animateXPBar === 'function') ? window.Dashboard.animateXPBar : ((window.AppUtils && window.AppUtils.animateXPBar) ? window.AppUtils.animateXPBar : function(element, targetWidth) { const currentWidth = parseFloat(element.style.width) || 0; const duration = 700; const frameRate = 1000 / 60; const totalFrames = duration / frameRate; const delta = targetWidth - currentWidth; let frame = 0; const easeOutQuad = (t) => t * (2 - t); const interval = setInterval(() => { frame++; const progress = easeOutQuad(frame / totalFrames); const newWidth = currentWidth + delta * progress; element.style.width = `${newWidth}%`; if (frame >= totalFrames) clearInterval(interval); }, frameRate); });

function showLevelUpBadge(attribute, newLevel) {
  if (window.Dashboard && typeof window.Dashboard.showLevelUpBadge === 'function') return window.Dashboard.showLevelUpBadge(attribute, newLevel);
  console.warn('Dashboard.showLevelUpBadge not available');
}

function wireSubAttributeToggles() {
  if (window.Dashboard && typeof window.Dashboard.wireSubAttributeToggles === 'function') return window.Dashboard.wireSubAttributeToggles();
  console.warn('Dashboard.wireSubAttributeToggles not available');
}

// ✅ Activity Browser (delegated to js/activities.js)
function loadActivities() {
  if (window.Activities && typeof window.Activities.init === 'function') return window.Activities.init();
  console.warn('Activities module not available; falling back to no-op loadActivities');
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

// Wire the reflect button to open the quick reflect modal exposed by Reflections.showModal()
function wireReflectButton() {
  const reflectBtn = document.getElementById('reflectBtn');
  if (!reflectBtn) return;
  if (reflectBtn.dataset.wired) return;
  reflectBtn.dataset.wired = 'true';
  reflectBtn.addEventListener('click', () => {
    try {
      if (window.Reflections && typeof window.Reflections.showModal === 'function') {
        window.Reflections.showModal();
        return;
      }
      // Fallback: if Reflections isn't available (older cached bundle), load the reflections partial as a safe fallback
      fetch('partials/reflections.html').then(res => res.text()).then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        try { if (window.Reflections && typeof window.Reflections.wireForm === 'function') window.Reflections.wireForm(); } catch(e) {}
      }).catch(()=>{});
    } catch(e) { /* ignore */ }
  });
}

function initActivityForm() {
  if (window.ActivityForm && typeof window.ActivityForm.init === 'function') return window.ActivityForm.init();
  console.warn('ActivityForm module not available; falling back to no-op initActivityForm');
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

  // Wire display name input if present
  const displayInput = document.getElementById('displayNameInput');
  const saveNameBtn = document.getElementById('saveDisplayNameBtn');
  if (displayInput && !displayInput.dataset.wired) {
    try{
      const user = Storage.load();
      displayInput.value = user.name || '';
    }catch(e){ displayInput.value = ''; }
    if (saveNameBtn) {
      saveNameBtn.addEventListener('click', () => {
        const val = (displayInput.value || '').trim();
        try{
          const u = Storage.load();
          u.name = val;
          Storage.save(u);
          // update UI
          const nameEl = document.querySelector('[data-user-name]');
          if (nameEl) nameEl.textContent = val || '';
          const initial = document.getElementById('userInitial');
          if (initial) initial.textContent = (val && val.length>0) ? val.charAt(0).toUpperCase() : '?';
          showToast('Display name saved');
        }catch(e){ showToast('Unable to save name'); }
      });
    }
    displayInput.dataset.wired = 'true';
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
// 🪄 Toast helper: stacked container to avoid overlapping toasts
function _ensureToastContainer(){
  let c = document.getElementById('toastContainer');
  if (c) return c;
  c = document.createElement('div');
  c.id = 'toastContainer';
  c.style.position = 'fixed';
  c.style.right = '16px';
  c.style.bottom = '16px';
  c.style.display = 'flex';
  c.style.flexDirection = 'column';
  c.style.gap = '8px';
  c.style.zIndex = 9999;
  document.body.appendChild(c);
  return c;
}

function showToast(msg, opts){
  try{
    const c = _ensureToastContainer();
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.className = 'bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
    toast.style.transform = 'translateY(8px)';
    c.appendChild(toast);
    // animate in
    requestAnimationFrame(()=>{ toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    const life = (opts && opts.duration) ? Number(opts.duration) : 2500;
    setTimeout(()=>{
      toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)';
      setTimeout(()=>{ try{ toast.remove(); }catch(e){} }, 250);
    }, life);
  }catch(e){ console.error('showToast error', e); }
}

  // ARIA live region for screen-reader announcements
  function ensureLiveRegion() {
    if (document.getElementById('a11yLiveRegion')) return document.getElementById('a11yLiveRegion');
    const r = document.createElement('div');
    r.id = 'a11yLiveRegion';
    r.setAttribute('aria-live', 'polite');
    r.setAttribute('aria-atomic', 'true');
    r.className = 'sr-only';
    document.body.appendChild(r);
    return r;
  }

  function announceForA11y(text) {
    try{ if (window.AppUtils && window.AppUtils.announceForA11y) return window.AppUtils.announceForA11y(text); }catch(e){}
  }

  // Development helper: when running on localhost, show a small update button
  try{
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const devBtn = document.createElement('button');
      devBtn.id = 'forceReloadBtn';
      devBtn.textContent = 'Update assets (dev)';
      devBtn.className = 'fixed top-4 right-4 z-60 bg-yellow-500 text-black px-3 py-1 rounded';
      devBtn.style.fontSize = '12px';
      devBtn.title = 'Unregister service worker, clear caches and reload (dev only)';
      devBtn.addEventListener('click', async () => {
        showToast('Clearing service worker and caches...');
        try{
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister().catch(()=>{})));
          }
          if (window.caches && caches.keys) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        }catch(e){ console.error('dev clear error', e); }
        setTimeout(()=> location.reload(), 200);
      });
      document.body.appendChild(devBtn);
    }
  }catch(e){}
