// sw-ui.js — service worker registration and update-banner UI
(function(){
  function _toast(msg){ try{ if (window.AppUtils && window.AppUtils.showToast) return window.AppUtils.showToast(msg); }catch(e){} try{ const t=document.createElement('div'); t.textContent=msg; t.className='fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeInOut z-50'; document.body.appendChild(t); setTimeout(()=>t.remove(),2500);}catch(e){} }

  function init(){
    try{
      if (!('serviceWorker' in navigator)) return;
  let swRegistration = null;
  let userAcceptedUpdate = false;
  let autoApplyTimer = null;
  let currentBanner = null;
  // auto-apply timeout (seconds). Use a shorter timeout for mobile devices.
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const AUTO_APPLY_SECONDS = isMobile ? 3 : 6;

      function createUpdateBanner(){
        if (document.getElementById('updateBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'updateBanner';
        banner.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-gray-100 px-4 py-3 rounded-lg shadow-lg z-60 flex items-center gap-3';
        banner.innerHTML = `
          <div class="flex-1 text-sm">A new version is available. Reloading in <span id="updateCountdown">${AUTO_APPLY_SECONDS}</span>s</div>
          <div class="flex gap-2">
            <button id="updateNowBtn" class="px-3 py-1 rounded bg-green-600 text-white text-sm">Reload now</button>
            <button id="updateLaterBtn" class="px-3 py-1 rounded bg-gray-700 text-sm">Later</button>
          </div>
        `;
  document.body.appendChild(banner);
  currentBanner = banner;
        const countdownEl = document.getElementById('updateCountdown');
        const later = document.getElementById('updateLaterBtn'); if (later) later.addEventListener('click', ()=>{
          if (autoApplyTimer) { clearInterval(autoApplyTimer); autoApplyTimer = null; }
          removeUpdateBanner();
        });
        const now = document.getElementById('updateNowBtn'); if (now) now.addEventListener('click', async ()=>{
          try{
            if (!swRegistration) return;
            // user accepted — remove the banner immediately so the UI isn't stuck
            userAcceptedUpdate = true;
            removeUpdateBanner();
            if (swRegistration.waiting) { try{ swRegistration.waiting.postMessage({type:'SKIP_WAITING'}); }catch(e){} }
            else { const installing = swRegistration.installing; if (installing) try{ installing.postMessage({type:'SKIP_WAITING'}); }catch(e){} }
            _toast('Applying update...');
          }catch(e){ console.error('update now error', e); }
        });

        // Auto-apply countdown
        try{
          let secs = AUTO_APPLY_SECONDS;
          autoApplyTimer = setInterval(()=>{
            secs -= 1;
            if (countdownEl) countdownEl.textContent = String(secs);
            if (secs <= 0) {
              clearInterval(autoApplyTimer); autoApplyTimer = null;
              try{
                if (!swRegistration) return;
                // mark as accepted so controllerchange will reload
                userAcceptedUpdate = true;
                removeUpdateBanner();
                if (swRegistration.waiting) { swRegistration.waiting.postMessage({type:'SKIP_WAITING'}); }
                else if (swRegistration.installing) { swRegistration.installing.postMessage({type:'SKIP_WAITING'}); }
                _toast('Applying update...');
              }catch(e){ console.error('auto apply failed', e); }
            }
          }, 1000);
        }catch(e){}
      }

      navigator.serviceWorker.register('serviceworker.js').then(reg=>{
        swRegistration = reg;
        if (reg.waiting) createUpdateBanner();
        // trigger an explicit update check and request the SW to refresh its cached assets
        try{
          if (reg.update) try{ reg.update(); }catch(e){}
          // Ask the active worker to check for updates (it will fetch assets no-store)
          if (reg.active && reg.active.postMessage) {
            try{ reg.active.postMessage({type:'CHECK_FOR_UPDATE'}); }catch(e){}
          }
        }catch(e){}

        reg.addEventListener('updatefound', ()=>{
          const newWorker = reg.installing; if (!newWorker) return;
          newWorker.addEventListener('statechange', ()=>{ if (newWorker.state==='installed' && navigator.serviceWorker.controller) createUpdateBanner(); });
        });
  navigator.serviceWorker.addEventListener('message', (ev)=>{ try{ const data = ev.data||{}; if (data && data.type === 'SW_UPDATED') { createUpdateBanner(); } if (data && (data.type === 'SW_ACTIVATED' || data.type === 'SW_UPDATED')) { _toast('Update ready'); removeUpdateBanner(); } }catch(e){} });
      }).catch(err=>console.warn('SW register failed', err));

      // quick deployed-version check: fetch sw-version.json (no-store) and compare to last seen
      try{
        (async function(){
          try{
            const res = await fetch('sw-version.json', {cache: 'no-store'});
            if (!res || !res.ok) return;
            const data = await res.json();
            const remote = data && data.cache;
            const last = localStorage.getItem('lvl_sw_version') || null;
            if (remote && remote !== last) {
              localStorage.setItem('lvl_sw_version', remote);
              // ask SW to check for updates and show banner
              try{ if (swRegistration && swRegistration.active && swRegistration.active.postMessage) swRegistration.active.postMessage({type:'CHECK_FOR_UPDATE'}); }catch(e){}
              try{ createUpdateBanner(); }catch(e){}
            }
          }catch(e){}
        })();
      }catch(e){}

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', ()=>{
        if (refreshing) return; if (!userAcceptedUpdate) return; refreshing = true; try{ removeUpdateBanner(); }catch(e){} window.location.reload();
      });

      function removeUpdateBanner(){
        try{
          if (autoApplyTimer) { clearInterval(autoApplyTimer); autoApplyTimer = null; }
          if (currentBanner && currentBanner.parentNode) { currentBanner.parentNode.removeChild(currentBanner); }
          currentBanner = null;
        }catch(e){}
      }

    }catch(e){ console.error('SWUI.init error', e); }
  }

  // Dev helper: create a small button when running on localhost to clear SW and caches
  function devButtonWire(){
    try{
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1'){
        const devBtn = document.createElement('button');
        devBtn.id = 'forceReloadBtn'; devBtn.textContent = 'Update assets (dev)'; devBtn.className = 'fixed top-4 right-4 z-60 bg-yellow-500 text-black px-3 py-1 rounded'; devBtn.style.fontSize='12px'; devBtn.title='Unregister service worker, clear caches and reload (dev only)';
        devBtn.addEventListener('click', async ()=>{
          _toast('Clearing service worker and caches...');
          try{ if ('serviceWorker' in navigator){ const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister().catch(()=>{}))); } if (window.caches && caches.keys){ const keys = await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k))); } }catch(e){ console.error('dev clear error', e); }
          setTimeout(()=>location.reload(), 200);
        });
        document.body.appendChild(devBtn);
      }
    }catch(e){}
  }

  window.SWUI = { init, devButtonWire };
})();
