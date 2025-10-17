/* leaderboard.js — simple local leaderboard derived from activity history */
(function(){
  function summarizeHistory(list){
    const counts = {};
    for (const it of list || []){
      const name = it.activityName || it.name || 'Activity';
      counts[name] = (counts[name] || 0) + 1;
    }
    const arr = Object.entries(counts).map(([name,count]) => ({ name, count })).sort((a,b)=> b.count - a.count);
    return arr;
  }

  function render(elList, elSummary){
    const raw = (window.Storage && typeof Storage.getActivityHistory === 'function') ? Storage.getActivityHistory() : (JSON.parse(localStorage.getItem('lvl_activity_history_v1')||'[]'));
    const summary = summarizeHistory(raw || []);
    if (!elSummary) return;
    const total = raw ? raw.length : 0;
    elSummary.textContent = `Total logged activities: ${total}. Top activities:`;
    if (!elList) return;
    if (summary.length === 0) { elList.innerHTML = '<div class="text-gray-500">No activity history yet.</div>'; return; }
    elList.innerHTML = summary.slice(0,10).map((r, idx) => `
      <div class="p-2 rounded bg-gray-800 flex justify-between items-center">
        <div class="font-medium text-gray-200">${escapeHtml(r.name)}</div>
        <div class="text-xs text-gray-400">${r.count}x</div>
      </div>
    `).join('');
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

  function wire(){
    const elList = document.getElementById('leaderboardList');
    const elSummary = document.getElementById('leaderboardSummary');
    render(elList, elSummary);
  }

  window.Leaderboard = { wire };
})();
