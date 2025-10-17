// sw-ui.js — service worker registration and update-banner UI
(function(){
  function _toast(msg){ try{ if (window.AppUtils && window.AppUtils.showToast) return window.AppUtils.showToast(msg); }catch(e){} try{ const t=document.createElement('div'); t.textContent=msg; t.className='fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeInOut z-50'; document.body.appendChild(t); setTimeout(()=>t.remove(),2500);}catch(e){} }

  function init(){
    try{
      if (!('serviceWorker' in navigator)) return;
      let swRegistration = null;
      let userAcceptedUpdate = false;

      function createUpdateBanner(){
        if (document.getElementById('updateBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'updateBanner';
        banner.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-gray-100 px-4 py-3 rounded-lg shadow-lg z-60 flex items-center gap-3';
        banner.innerHTML = `
          <div class="flex-1 text-sm">A new version is available.</div>
          <div class="flex gap-2">
            <button id="updateNowBtn" class="px-3 py-1 rounded bg-green-600 text-white text-sm">Reload now</button>
            <button id="updateLaterBtn" class="px-3 py-1 rounded bg-gray-700 text-sm">Later</button>
          </div>
        `;
        document.body.appendChild(banner);
        const later = document.getElementById('updateLaterBtn'); if (later) later.addEventListener('click', ()=>banner.remove());
        const now = document.getElementById('updateNowBtn'); if (now) now.addEventListener('click', async ()=>{
          try{
            if (!swRegistration) return;
            if (swRegistration.waiting) { userAcceptedUpdate = true; try{ swRegistration.waiting.postMessage({type:'SKIP_WAITING'}); }catch(e){} }
            else { const installing = swRegistration.installing; if (installing) try{ installing.postMessage({type:'SKIP_WAITING'}); }catch(e){} }
            _toast('Applying update...');
          }catch(e){ console.error('update now error', e); }
        });
      }

      navigator.serviceWorker.register('serviceworker.js').then(reg=>{
        swRegistration = reg;
        if (reg.waiting) createUpdateBanner();
        reg.addEventListener('updatefound', ()=>{
          const newWorker = reg.installing; if (!newWorker) return;
          newWorker.addEventListener('statechange', ()=>{ if (newWorker.state==='installed' && navigator.serviceWorker.controller) createUpdateBanner(); });
        });
        navigator.serviceWorker.addEventListener('message', (ev)=>{ try{ const data = ev.data||{}; if (data && data.type === 'SW_UPDATED') createUpdateBanner(); }catch(e){} });
      }).catch(err=>console.warn('SW register failed', err));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', ()=>{
        if (refreshing) return; if (!userAcceptedUpdate) return; refreshing = true; window.location.reload();
      });

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
