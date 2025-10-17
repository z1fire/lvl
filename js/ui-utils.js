// ui-utils.js — small UI utility functions used across the app
(function(){
  function escapeHtml(s){ return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function showToast(msg) {
    try{
      const toast = document.createElement("div");
      toast.textContent = msg;
      toast.className = "fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeInOut z-50";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    }catch(e){ console.error('showToast error', e); }
  }

  function ensureLiveRegion() {
    try{
      if (document.getElementById('a11yLiveRegion')) return document.getElementById('a11yLiveRegion');
      const r = document.createElement('div');
      r.id = 'a11yLiveRegion';
      r.setAttribute('aria-live', 'polite');
      r.setAttribute('aria-atomic', 'true');
      r.className = 'sr-only';
      document.body.appendChild(r);
      return r;
    }catch(e){ return null; }
  }

  function announceForA11y(text) {
    try{
      const r = ensureLiveRegion(); if (!r) return;
      r.textContent = '';
      setTimeout(() => { r.textContent = text; }, 50);
    }catch(e){ }
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  function animateXPBar(element, targetWidth) {
    try{
      const currentWidth = parseFloat(element.style.width) || 0;
      const duration = 700;
      const frameRate = 1000 / 60;
      const totalFrames = duration / frameRate;
      const delta = targetWidth - currentWidth;
      let frame = 0;
      const easeOutQuad = (t) => t * (2 - t);

      const interval = setInterval(() => {
        frame++;
        const progress = easeOutQuad(frame / totalFrames);
        const newWidth = currentWidth + delta * progress;
        element.style.width = `${newWidth}%`;
        if (frame >= totalFrames) clearInterval(interval);
      }, frameRate);
    }catch(e){ }
  }

  // Expose
  window.AppUtils = {
    escapeHtml,
    showToast,
    ensureLiveRegion,
    announceForA11y,
    debounce,
    animateXPBar
  };
})();
