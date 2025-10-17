// activities.js — encapsulates the Activity Browser logic
(function(){
  const App = {};

  function init() {
    const list = document.getElementById("activitiesList");
    const search = document.getElementById("activitySearch");
    const catContainer = document.getElementById("categoryFilters");
    const tagContainer = document.getElementById("tagFilters");
    if (!list) return;

    // local cache + simple inverted index
    let cache = { activities: [], index: [], categories: [], tags: [] };
    const userFavs = (window.Storage && typeof Storage.getCustomActivities === 'function') ? Storage.getCustomActivities() : [];

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
      cache.tags = [...new Set(activities.flatMap(a => a.tags).filter(t => !allSubAttrs.has(String(t).toLowerCase())))];
    }

    function renderFilters() {
      if (!catContainer) return;
      catContainer.innerHTML = cache.categories.map(cat => `<button class="cat-btn px-3 py-1 rounded-full bg-gray-800 text-gray-300 hover:bg-green-600 hover:text-white">${cat}</button>`).join('');
      if (tagContainer) tagContainer.innerHTML = '';
      catContainer.querySelectorAll('.cat-btn').forEach(btn => btn.addEventListener('click', () => {
        const cat = btn.textContent;
        if (activeCategory === cat) activeCategory = null; else activeCategory = cat;
        catContainer.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('bg-green-600', b.textContent === activeCategory));
        doSearch();
      }));

      if (tagContainer) tagContainer.querySelectorAll('.tag-btn').forEach(btn => btn.addEventListener('click', () => {
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
      card.className = `p-3 rounded-xl bg-gray-900 border ${isFav ? 'border-green-500' : 'border-gray-800'} shadow-sm flex justify-between items-center cursor-pointer`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${act.name} — toggle favorite`);

      const coreAttrs = Object.keys(act.attributes || {});
      const tagsText = coreAttrs.join(', ');

      card.innerHTML = `
      <div class="flex-1">
        <p class="text-gray-200 font-medium">${act.name}</p>
        <p class="text-xs text-gray-400">${tagsText}</p>
      </div>
      <button data-activity-id="${act.id}" aria-pressed="${isFav ? 'true' : 'false'}" aria-label="Favorite ${act.name}" class="star-btn text-sm ${isFav ? 'text-green-400' : 'text-gray-500'} hover:text-green-400">${isFav ? '★' : '☆'}</button>
    `;

      card.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('button[data-activity-id]')) return;
        toggleFavorite(act.id);
      });

      // Tap/scroll heuristics
      (function addTapScrollDistinction() {
        const MOVE_THRESHOLD = 10;
        const TIME_THRESHOLD = 500;
        let pointerState = null;
        card.addEventListener('pointerdown', (ev) => {
          try { if (ev.button && ev.button !== 0) return; pointerState = { id: ev.pointerId, startX: ev.clientX, startY: ev.clientY, startTime: Date.now(), moved: false }; } catch(e){}
        }, { passive: true });
        card.addEventListener('pointermove', (ev) => { try { if (!pointerState || ev.pointerId !== pointerState.id) return; const dx = Math.abs(ev.clientX - pointerState.startX); const dy = Math.abs(ev.clientY - pointerState.startY); if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) pointerState.moved = true; } catch(e){} }, { passive: true });
        card.addEventListener('pointerup', (ev) => { try { if (!pointerState || ev.pointerId !== pointerState.id) { pointerState = null; return; } const duration = Date.now() - (pointerState.startTime || 0); if (!pointerState.moved && duration < TIME_THRESHOLD) { if (!(ev.target && ev.target.closest && ev.target.closest('button[data-activity-id]'))) { toggleFavorite(act.id); } } } catch(e){} pointerState = null; }, { passive: true });
        card.addEventListener('touchstart', (ev) => { try{ const t = ev.touches && ev.touches[0]; if (!t) return; pointerState = { startX: t.clientX, startY: t.clientY, startTime: Date.now(), moved: false }; }catch(e){} }, { passive: true });
        card.addEventListener('touchmove', (ev) => { try{ const t = ev.touches && ev.touches[0]; if (!t || !pointerState) return; const dx = Math.abs(t.clientX - pointerState.startX); const dy = Math.abs(t.clientY - pointerState.startY); if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) pointerState.moved = true; }catch(e){} }, { passive: true });
        card.addEventListener('touchend', (ev) => { try{ const ct = ev.changedTouches && ev.changedTouches[0]; const duration = Date.now() - (pointerState && pointerState.startTime || 0); if (pointerState && !pointerState.moved && duration < TIME_THRESHOLD) { const target = ct && document.elementFromPoint(ct.clientX, ct.clientY); if (!(target && target.closest && target.closest('button[data-activity-id]'))) { toggleFavorite(act.id); } } }catch(e){} pointerState = null; }, { passive: true });
      })();

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const btn = card.querySelector('button[data-activity-id]'); if (btn) btn.click(); }
      });

      return card;
    }

    function doSearch() {
      const q = (search && search.value || '').toLowerCase().trim();
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

    const debounceFn = (window.AppUtils && window.AppUtils.debounce) ? window.AppUtils.debounce : function(fn, wait){ let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; };

    function toggleFavorite(id) {
      try{
        const wasFav = userFavs.includes(id);
        if (wasFav && window.Storage && typeof Storage.removeCustomActivity === 'function') Storage.removeCustomActivity(id);
        else if (window.Storage && typeof Storage.addCustomActivity === 'function') Storage.addCustomActivity(id);
        const updatedFavs = (window.Storage && typeof Storage.getCustomActivities === 'function') ? Storage.getCustomActivities() : [];
        userFavs.splice(0, userFavs.length, ...updatedFavs);
        doSearch();
        try{ const act = cache.activities.find(a=>a.id===id); const name = act ? act.name : id; if (window.AppUtils && window.AppUtils.announceForA11y) window.AppUtils.announceForA11y(`${name} ${wasFav ? 'removed from favorites' : 'added to favorites'}`); }catch(e){}
      }catch(e){ console.error('toggleFavorite error', e); }
    }

    list.addEventListener('click', (e) => {
      if (e.target.matches('button[data-activity-id]')) {
        const id = e.target.dataset.activityId;
        toggleFavorite(id);
      }
    });

    if (favToggle) {
      favToggle.addEventListener('click', () => { showFavoritesOnly = !showFavoritesOnly; favToggle.classList.toggle('bg-green-600', showFavoritesOnly); doSearch(); });
    }

    // initial fetch + boot
    fetch('data/activities.json').then(r => r.json()).then(activities => {
      buildIndex(activities);
      renderFilters();
      if (search) search.addEventListener('input', debounceFn(doSearch, 180));
      currentResults = cache.activities.slice();
      renderPage(true);
    }).catch(err => { console.error('activities fetch failed', err); if (list) list.innerHTML = '<div class="text-red-400 p-3">Unable to load activities.</div>'; });
  }

  window.Activities = { init };
})();
