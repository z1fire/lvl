/* notifs-ui.js - renders notifications list and dashboard delta badges */
(function(){
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

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

        const detail = document.createElement('div');
        detail.className = 'notif-detail hidden';
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

        header.addEventListener('click', (ev) => { if (ev.target && ev.target.classList && ev.target.classList.contains('mark-read')) return; detail.classList.toggle('hidden'); });
        listEl.appendChild(card);
      });

      const clearBtn = document.getElementById('clearNotifs');
      const markAllBtn = document.getElementById('markAllRead');
      if(clearBtn && !clearBtn.dataset.wired){ clearBtn.addEventListener('click', () => { if(confirm('Clear all notifications?')) { window.Notifs.clear(); }}); clearBtn.dataset.wired = 'true'; }
      if(markAllBtn && !markAllBtn.dataset.wired){ markAllBtn.addEventListener('click', () => { window.Notifs.markAllRead(); }); markAllBtn.dataset.wired = 'true'; }

      listEl.querySelectorAll('.mark-read').forEach(btn => btn.addEventListener('click', () => { const id = btn.dataset.id; if(!id) return; window.Notifs.markRead(id); }));
    }catch(e){ console.error('renderNotificationsList error', e); }
  }

  function renderDashboardDeltasFromLatestNotif(){
    try{
      if (!(window.Notifs && window.Notifs.list)) return;
      const list = window.Notifs.list();
      const decay = list.find(n => n.type === 'decay' && n.meta && n.meta.perAttribute);
      if (!decay) return;
      const per = decay.meta.perAttribute || {};
      for (const [attr, v] of Object.entries(per)){
        const delta = (Number(v.before||0) - Number(v.after||0)) || 0;
        if (delta === 0) continue;
        const card = document.querySelector(`[data-attr='${attr}']`);
        if (!card) continue;
        const existing = card.querySelector('.attr-delta-badge'); if (existing) existing.remove();
        const badge = document.createElement('div'); badge.className = 'attr-delta-badge attr-delta-fade'; badge.textContent = `-${delta}`; card.style.position = 'relative'; card.appendChild(badge);
        setTimeout(()=>{ badge.remove(); }, 3200);
      }
    }catch(e){ console.error('renderDashboardDeltas error', e); }
  }

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

  function _toast(msg){
    try{ if (window.AppUtils && typeof window.AppUtils.showToast === 'function') return window.AppUtils.showToast(msg); }catch(e){}
    try{ const t = document.createElement('div'); t.textContent = msg; t.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeInOut z-50'; document.body.appendChild(t); setTimeout(()=>t.remove(),2500); }catch(e){}
  }

  function wire(){
    try{
      window.addEventListener('lvl:notifs:update', () => {
        try{ updateNotifCount(); }catch(e){}
        try{ renderNotificationsList(); }catch(e){}
        try{ renderDashboardDeltasFromLatestNotif(); }catch(e){}
        try{
          const list = (window.Notifs && window.Notifs.list) ? window.Notifs.list() : [];
          const unread = list.filter(n=>!n.read).length;
          const bell = document.getElementById('notifBell');
          if(bell && unread>0){ bell.classList.add('bell-pulse'); setTimeout(()=>bell.classList.remove('bell-pulse'),800); }
        }catch(e){}
      });
      // initial sync
      updateNotifCount();
      window.addEventListener('lvl:notifs:added', (ev) => {
        try{
          const n = ev && ev.detail ? ev.detail : null;
          if (n && n.message) _toast(n.message);
          const bell = document.getElementById('notifBell'); if (bell) { bell.classList.add('bell-pulse'); setTimeout(()=>bell.classList.remove('bell-pulse'),800); }
          try{ updateNotifCount(); }catch(e){}
        }catch(e){}
      });
    }catch(e){ console.error('NotifsUI.wire error', e); }
  }

  // Notifs debug overlay removed for production.

  window.NotifsUI = { renderNotificationsList, renderDashboardDeltasFromLatestNotif, updateNotifCount, wire };
})();
