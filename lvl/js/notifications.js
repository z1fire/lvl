// Simple local notifications manager
const Notifs = (function(){
  const KEY = 'lvl_notifications_v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e){ return []; }
  }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch(e){} }

  function list() { return load().slice().reverse(); } // newest first
  function add(type, message, meta) {
    const arr = load();
    const obj = { id: Date.now() + '-' + Math.random().toString(36).slice(2,7), type, message, meta: meta||null, ts: Date.now(), read: false };
    arr.push(obj);
    save(arr);
  // emit two events: generic update and a specific added event with detail
    fireUpdate();
    window.dispatchEvent(new CustomEvent('lvl:notifs:added', { detail: obj }));
  }
  function clear() { save([]); fireUpdate(); }
  function markRead(id){ const arr = load(); const it = arr.find(i=>i.id===id); if(it) it.read = true; save(arr); fireUpdate(); }
  function markAllRead(){ const arr = load(); arr.forEach(i=>i.read=true); save(arr); fireUpdate(); }

  // simple event for UI wiring
  function fireUpdate(){ window.dispatchEvent(new CustomEvent('lvl:notifs:update')); }

  return { list, add, clear, markRead, markAllRead };
})();

// Expose to global for quick usage in the console/tests
window.Notifs = Notifs;

// On load, announce
window.addEventListener('DOMContentLoaded', () => window.dispatchEvent(new CustomEvent('lvl:notifs:update')));
