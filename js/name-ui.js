// name-ui.js — handles inline name edits and first-run name prompt
(function(){
  function _toast(msg){
    try{ if (window.AppUtils && typeof window.AppUtils.showToast === 'function') return window.AppUtils.showToast(msg); }catch(e){}
    // fallback
    try{
      const t = document.createElement('div'); t.textContent = msg; t.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeInOut z-50'; document.body.appendChild(t); setTimeout(()=>t.remove(),2500);
    }catch(e){}
  }

  function enableInlineNameEdit(){
    try{
      const nameSpan = document.getElementById('userNameDisplay') || document.querySelector('[data-user-name]');
      const editBtn = document.getElementById('editNameBtn');
      if (!nameSpan || nameSpan.dataset && nameSpan.dataset.wired) return;
      const startEdit = () => {
        if (nameSpan.tagName === 'INPUT') return;
        const current = (nameSpan.textContent || '').trim();
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'bg-gray-800 text-white rounded px-2 py-1';
        input.value = current;
        input.id = 'inlineNameInput';
        nameSpan.replaceWith(input);
        input.focus();

        function finishSave(){
          const val = (input.value || '').trim();
          try{ const u = Storage.load(); u.name = val; Storage.save(u); }catch(e){}
          const span = document.createElement('span'); span.id = 'userNameDisplay'; span.textContent = val || '';
          input.replaceWith(span);
          const initial = document.getElementById('userInitial'); if (initial) initial.textContent = (val && val.length>0) ? val.charAt(0).toUpperCase() : '?';
          _toast('Display name saved');
          // re-wire
          enableInlineNameEdit();
        }

        input.addEventListener('blur', finishSave);
        input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); } if (ev.key === 'Escape') { window.location.reload(); } });
      };

      if (editBtn) { editBtn.addEventListener('click', startEdit); }
      nameSpan.addEventListener('click', startEdit);
      try{ nameSpan.dataset.wired = 'true'; }catch(e){}
    }catch(e){}
  }

  function showNamePromptModal(){
    try{
      const existing = document.getElementById('namePromptModal'); if (existing) return;
      const overlay = document.createElement('div'); overlay.id = 'namePromptModal'; overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60';
      overlay.innerHTML = `
        <div class="bg-gray-900 p-6 rounded-lg w-11/12 max-w-md">
          <h3 class="text-lg font-semibold text-green-400 mb-2">Welcome — what's your name?</h3>
          <p class="text-sm text-gray-400 mb-3">Enter a display name so the app can personalize your profile. Stored locally only.</p>
          <input id="namePromptInput" class="w-full bg-gray-800 text-white rounded px-3 py-2 mb-3" placeholder="Your name" />
          <div class="flex justify-end gap-2">
            <button id="namePromptSkip" class="px-3 py-2 rounded bg-gray-700 text-white">Skip</button>
            <button id="namePromptSave" class="px-3 py-2 rounded bg-green-600 text-white">Save</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const inp = document.getElementById('namePromptInput'); if (inp) inp.focus();
      const saveBtn = document.getElementById('namePromptSave');
      const skipBtn = document.getElementById('namePromptSkip');
      if (saveBtn) saveBtn.addEventListener('click', () => {
        const val = (inp.value || '').trim();
        try{ const u = Storage.load(); u.name = val; Storage.save(u); }catch(e){}
        const nameEl = document.querySelector('[data-user-name]'); if (nameEl) nameEl.textContent = val || '';
        const initial = document.getElementById('userInitial'); if (initial) initial.textContent = (val && val.length>0) ? val.charAt(0).toUpperCase() : '?';
        overlay.remove();
        _toast('Welcome' + (val ? `, ${val}` : '') + '!');
      });
      if (skipBtn) skipBtn.addEventListener('click', () => { overlay.remove(); });
    }catch(e){}
  }

  // Expose
  window.NameUI = {
    enableInlineNameEdit,
    showNamePromptModal
  };
})();
