// milestones.js — render the milestones radar chart (webhook UI removed)
(function(){
  function wire() {
    try{
      // only render the attributes radar — webhook inputs removed by request
      try{ renderAttributesRadar(); }catch(e){ console.error('renderAttributesRadar error', e); }
    }catch(e){ console.error('milestones wire error', e); }
  }

  // Simple radar chart rendering for the five core attributes.
  function renderAttributesRadar() {
    try{
      const container = document.getElementById('attributesChart'); if (!container) return;
      // attribute order and labels
      const attrs = [
        { key: 'fitness', label: 'Fitness' },
        { key: 'knowledge', label: 'Knowledge' },
        { key: 'wisdom', label: 'Wisdom' },
        { key: 'discipline', label: 'Discipline' },
        { key: 'mindfulness', label: 'Mindfulness' }
      ];
      const user = (window.Storage && typeof Storage.load === 'function') ? Storage.load() : null;
      if (!user) return;
      // compute a normalized value for each attribute: level + xp/threshold mapped to 0..1 across a capped max
      const values = attrs.map(a => {
        const attr = (user.attributes && user.attributes[a.key]) || { level:1, xp:0 };
        const level = attr.level || 1; const xp = attr.xp || 0;
        const threshold = (level) * 200;
        const normalized = Math.min(1, (level - 1 + (xp / threshold)) / 5); // divide by 5 as a simple scale
        return Math.max(0, Math.min(1, normalized));
      });

      // build svg
      const size = 280; const cx = size/2; const cy = size/2; const radius = 100;
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
      // background polygon grid (3 rings)
      for (let r=3; r>=1; r--) {
        const t = document.createElementNS(svgNS,'polygon');
        const pts = attrs.map((_,i)=>{
          const ang = (Math.PI * 2 * i / attrs.length) - Math.PI/2;
          const rr = radius * (r/3);
          return `${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)}`;
        }).join(' ');
        t.setAttribute('points', pts); t.setAttribute('fill', 'none'); t.setAttribute('stroke', '#374151'); t.setAttribute('stroke-width', '1'); svg.appendChild(t);
      }

      // labels
      attrs.forEach((a,i)=>{
        const ang = (Math.PI * 2 * i / attrs.length) - Math.PI/2; const lx = cx + (radius+18) * Math.cos(ang); const ly = cy + (radius+18) * Math.sin(ang);
        const text = document.createElementNS(svgNS,'text'); text.setAttribute('x', lx); text.setAttribute('y', ly); text.setAttribute('fill', '#9CA3AF'); text.setAttribute('font-size','11'); text.setAttribute('text-anchor','middle'); text.textContent = a.label; svg.appendChild(text);
      });

      // data polygon
      const poly = document.createElementNS(svgNS,'polygon');
      const dataPts = values.map((v,i)=>{
        const ang = (Math.PI * 2 * i / attrs.length) - Math.PI/2;
        const rr = radius * v;
        return `${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)}`;
      }).join(' ');
      poly.setAttribute('points', dataPts); poly.setAttribute('fill', '#10B981'); poly.setAttribute('fill-opacity','0.15'); poly.setAttribute('stroke','#10B981'); poly.setAttribute('stroke-width','2'); svg.appendChild(poly);

      // clear and append
      container.innerHTML = ''; container.appendChild(svg);
    }catch(e){ console.error('renderAttributesRadar', e); }
  }

  window.Milestones = { wire };
})();
