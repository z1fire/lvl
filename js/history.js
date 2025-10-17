/* history.js - renders activity history and wires interactions */
(function () {
  const DATE_OPTS = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };

  function fmt(ts) {
    try { return new Date(ts).toLocaleString(undefined, DATE_OPTS); }
    catch (e) { return String(ts); }
  }

  function renderList(listEl, items) {
    if (!listEl) return;
    if (!items || items.length === 0) {
      listEl.innerHTML = `<div class="text-gray-500">No activity history yet.</div>`;
      return;
    }
    listEl.innerHTML = items.map(it => {
      const title = (it.activityName || it.name || 'Activity');
  const note = it.details ? `<div id="details-${escapeHtml(it.id)}" class="text-xs text-gray-400 mt-1 history-details collapsed" data-id="${escapeHtml(it.id)}">${escapeHtml(it.details)}</div>` : '';
      // affordance: small chevron / details toggle (kept for visual cue)
      const afford = it.details ? `<button class="details-toggle text-xs text-gray-400 hover:text-gray-200" aria-controls="details-${escapeHtml(it.id)}" aria-expanded="false" data-id="${escapeHtml(it.id)}">Details <span class="chev inline-block transform transition-transform">▾</span></button>` : '';
      return `
        <div class="p-3 rounded-lg bg-gray-800 history-card" data-id="${escapeHtml(it.id)}" role="button" tabindex="0">
          <div class="flex justify-between items-baseline">
            <div class="font-medium text-gray-200">${escapeHtml(title)}</div>
            <div class="flex items-center gap-3">
              <div class="text-xs text-gray-400">${fmt(it.ts)}</div>
              ${afford}
            </div>
          </div>
          ${note}
        </div>
      `;
    }).join('');
  }

  // Small escape helper (keeps dependency-free)
  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getHistory() {
    if (window.Storage && typeof window.Storage.getActivityHistory === 'function') {
      try { return window.Storage.getActivityHistory(); }
      catch (e) { console.error('Storage.getActivityHistory failed', e); }
    }
    // Fallback: attempt to read a legacy key
    try {
      const raw = localStorage.getItem('lvl_activity_history_v1');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function clearHistory() {
    if (window.Storage && typeof window.Storage.clearActivityHistory === 'function') {
      try { window.Storage.clearActivityHistory(); return true; }
      catch (e) { console.error('Storage.clearActivityHistory failed', e); }
    }
    try { localStorage.removeItem('lvl_activity_history_v1'); return true; }
    catch (e) { return false; }
  }

  function wire() {
    const listEl = document.getElementById('activityHistoryList');
    const items = getHistory();
    renderList(listEl, items);

    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (!confirm('Clear all activity history?')) return;
        if (clearHistory()) {
          renderList(listEl, []);
        } else {
          alert('Failed to clear history');
        }
      });
    }
    // wire click to toggle details visibility
    try{
      // wire the details toggle buttons and make the whole card clickable
      const cards = listEl ? Array.from(listEl.querySelectorAll('.history-card')) : [];
      cards.forEach(card => {
        const id = card.getAttribute('data-id');
        // prefer the explicit details id
        const det = listEl.querySelector(`#details-${id}`) || listEl.querySelector(`.history-details[data-id="${id}"]`);
        const btn = card.querySelector('.details-toggle');
        const handler = () => {
          try{
            const target = det || listEl.querySelector(`#details-${id}`) || listEl.querySelector(`.history-details[data-id="${id}"]`);
            if (!target) return;
            const expanded = target.classList.toggle('expanded');
            // also toggle expanded on the card for css hooks
            card.classList.toggle('expanded', expanded);
            if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          }catch(e){}
        };
        // click/keyboard on the card toggles details
        card.addEventListener('click', (ev) => { handler(); });
        card.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); handler(); } });
        // ensure the affordance button also triggers the same handler but doesn't bubble
        if (btn) {
          btn.addEventListener('click', (ev) => { ev.stopPropagation(); handler(); });
          btn.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); handler(); } });
        }
      });
    }catch(e){ }
  }

  window.History = { render: wire, wire };
})();
