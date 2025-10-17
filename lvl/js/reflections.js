// reflections.js — encapsulate reflections list and form wiring
(function(){
  function render() {
    try{
      const listEl = document.getElementById('reflectionsList');
      if(!listEl) return;
      const items = (window.Storage && typeof Storage.getReflections === 'function') ? Storage.getReflections() : [];
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

  // Wire delegated delete handler for the reflections list. This is separate
  // from the form wiring because the reflections partial is sometimes
  // rendered as a placeholder without the form element. We attach the click
  // handler directly to the list container and guard against double-wiring.
  function wireListDelegation() {
    try{
      const listEl = document.getElementById('reflectionsList');
      if(!listEl) return;
      if (listEl.dataset.wiredDelete) return;
      listEl.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('.delete-reflection');
        if (!btn) return;
        const id = btn.dataset.id; if (!id) return;
        if (!confirm('Delete this reflection?')) return;
        if (window.Storage && typeof Storage.removeReflection === 'function') Storage.removeReflection(id);
        render(); if (window.showToast) showToast('Reflection deleted');
      });
      listEl.dataset.wiredDelete = 'true';
    }catch(e){ console.error('wireListDelegation', e); }
  }

  function wireForm() {
    try{
      const form = document.getElementById('reflectionForm');
  // If the partial no longer contains a form (we turned it into a placeholder),
  // still render any saved reflections and ensure the delete handlers are wired.
  if (!form) { render(); wireListDelegation(); return; }
      if (form.dataset.wired) { render(); return; }
      const textIn = document.getElementById('reflectionText');
      const tagsIn = document.getElementById('reflectionTags');
      const addBtn = document.getElementById('addReflectionBtn');

      addBtn.addEventListener('click', () => {
        const txt = (textIn.value || '').trim();
        if (!txt) { if (window.showToast) showToast('Reflection cannot be blank'); return; }
        const tags = (tagsIn.value || '').split(',').map(s=>s.trim()).filter(Boolean);
        if (window.Storage && typeof Storage.addReflection === 'function') Storage.addReflection(txt, tags);
        textIn.value = ''; tagsIn.value = '';
        render(); if (window.showToast) showToast('Reflection saved');
        const nav = document.querySelector(".nav-btn[data-page='reflections']"); if (nav) { nav.classList.add('bell-pulse'); setTimeout(()=>nav.classList.remove('bell-pulse'),800); }
      });

      // ensure the list has its delegated delete handler (works even if
      // the partial doesn't include the form)
      wireListDelegation();

      form.dataset.wired = 'true';
      render();
      // ensure delete handlers are wired for the rendered list
      wireListDelegation();
    }catch(e){ console.error('reflections wire error', e); }
  }
  // Show a small modal for quick reflection entry (used by dashboard Reflect button)
  function showModal() {
    try{
      // if modal already present, focus textarea
      let existing = document.getElementById('reflectionModal');
      if (existing) {
        const ta = existing.querySelector('#reflectionModalText'); if (ta) ta.focus();
        return;
      }

      const html = `
      <div id="reflectionModal" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div class="bg-gray-900 p-6 rounded-2xl w-80 relative shadow-xl">
          <button id="closeReflectionModal" class="absolute top-2 right-3 text-gray-400 hover:text-gray-200 text-xl">&times;</button>
          <h3 class="text-lg font-semibold text-green-400 mb-3">Quick Reflect</h3>
          <form id="reflectionModalForm" class="space-y-3">
            <textarea id="reflectionModalText" rows="4" class="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-100" placeholder="What did you learn or notice?"></textarea>
            <input id="reflectionModalTags" type="text" class="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-300" placeholder="tags (comma-separated)" />
            <div class="flex gap-2">
              <button id="reflectionModalSave" type="button" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg">Save</button>
              <button id="reflectionModalCancel" type="button" class="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      </div>`;

      document.body.insertAdjacentHTML('beforeend', html);
      const modal = document.getElementById('reflectionModal');
      const ta = document.getElementById('reflectionModalText');
      const tags = document.getElementById('reflectionModalTags');
      const save = document.getElementById('reflectionModalSave');
      const cancel = document.getElementById('reflectionModalCancel');
      const close = document.getElementById('closeReflectionModal');

      function closeModal() { try{ modal && modal.remove(); }catch(e){} }

      if (close) close.addEventListener('click', closeModal);
      if (cancel) cancel.addEventListener('click', closeModal);

      if (save) save.addEventListener('click', () => {
        const text = (ta && ta.value || '').trim();
        if (!text) { if (window.showToast) showToast('Reflection cannot be blank'); return; }
        const t = (tags && tags.value || '').split(',').map(s=>s.trim()).filter(Boolean);
        try{ if (window.Storage && typeof Storage.addReflection === 'function') Storage.addReflection(text, t); }catch(e){ console.error('addReflection failed', e); }
        closeModal();
        // update reflections list if visible
        try{ if (document.getElementById('reflectionsList') && window.Reflections && typeof window.Reflections.render === 'function') window.Reflections.render(); }catch(e){}
        if (window.showToast) showToast('Reflection saved');
        try{ const nav = document.querySelector(".nav-btn[data-page='reflections']"); if (nav) { nav.classList.add('bell-pulse'); setTimeout(()=>nav.classList.remove('bell-pulse'),800); } }catch(e){}
      });

      // autofocus textarea
      try{ if (ta) ta.focus(); }catch(e){}
      // allow Esc to close
      modal.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });

    }catch(e){ console.error('showReflectionModal', e); }
  }

  window.Reflections = { render, wireForm, showModal };
})();
