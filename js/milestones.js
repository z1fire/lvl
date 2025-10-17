// milestones.js — handle milestone notification settings (webhook & SMS test)
(function(){
  function wire() {
    try{
      const el = document.getElementById('milestoneNotify');
      if (!el) return;
      const WEBHOOK_KEY = 'lvl_milestone_webhook';
      const SMS_KEY = 'lvl_milestone_sms';
      const webhookIn = document.getElementById('webhookUrl');
      const smsIn = document.getElementById('smsNumber');
      const saveBtn = document.getElementById('saveNotifBtn');
      const testBtn = document.getElementById('testWebhookBtn');
      const smsBtn = document.getElementById('openSmsBtn');
      const status = document.getElementById('milestoneNotifyStatus');

      try { if (webhookIn) webhookIn.value = localStorage.getItem(WEBHOOK_KEY) || ''; } catch(e) { if (webhookIn) webhookIn.value = ''; }
      try { if (smsIn) smsIn.value = localStorage.getItem(SMS_KEY) || ''; } catch(e) { if (smsIn) smsIn.value = ''; }

      if (saveBtn && !saveBtn.dataset.wired) {
        saveBtn.addEventListener('click', () => {
          try{ localStorage.setItem(WEBHOOK_KEY, (webhookIn.value||'').trim()); localStorage.setItem(SMS_KEY, (smsIn.value||'').trim()); if (window.showToast) showToast('Milestone notification settings saved'); }catch(e){ if (window.showToast) showToast('Unable to save settings'); }
        });
        saveBtn.dataset.wired = 'true';
      }

      if (testBtn && !testBtn.dataset.wired) {
        testBtn.addEventListener('click', async () => {
          const url = (webhookIn.value||'').trim();
          if (status) status.textContent = 'Sending test...';
          if (!url) { if (status) status.textContent = 'No webhook URL configured.'; return; }
          try{
            const payload = { type: 'milestone_test', ts: Date.now(), message: 'Test milestone from LevelUp' };
            const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
            if (resp.ok) { if (status) status.textContent = 'Test webhook sent (200)'; if (window.showToast) showToast('Test webhook sent'); }
            else { if (status) status.textContent = `Webhook responded ${resp.status}`; }
          }catch(e){ if (status) status.textContent = 'Failed to send test webhook (network)'; }
        });
        testBtn.dataset.wired = 'true';
      }

      if (smsBtn && !smsBtn.dataset.wired) {
        smsBtn.addEventListener('click', () => {
          const number = (smsIn.value||'').trim();
          if (!number) { if (window.showToast) showToast('No phone number configured'); return; }
          const body = encodeURIComponent('I just hit a milestone in LevelUp!');
          const href = `sms:${number}?body=${body}`;
          window.location.href = href;
        });
        smsBtn.dataset.wired = 'true';
      }
    }catch(e){ console.error('milestones wire error', e); }
  }

  window.Milestones = { wire };
})();
