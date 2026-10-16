// ============================================================================
// Auto-save — keeps the sheet in this browser's localStorage every few
// seconds and restores it when the page is reopened. "Save Character (.json)"
// still works as before for backups / moving between devices.
// Self-contained: uses gatherData()/loadData() from js/app.js.
// ============================================================================
(function(){
  const KEY = 'dnd5e_sheet_autosave_v1';
  const BACKUP_KEY = KEY + '_prev';
  const INTERVAL_MS = 4000;
  let lastSerialized = null;
  let ready = false;

  function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSet(k,v){ try { localStorage.setItem(k,v); return true; } catch(e){ return false; } }

  function stamp(ok){
    const el = document.getElementById('autosaveStamp');
    if(!el) return;
    const t = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    el.textContent = ok ? `💾 Auto-saved ${t}` : '⚠ Auto-save unavailable';
    el.title = ok ? 'Your sheet is saved in this browser automatically.' : 'Browser storage is blocked or full — use Save Character (.json).';
  }

  function save(){
    if(!ready) return;
    let ser;
    try { ser = JSON.stringify(gatherData()); } catch(e){ return; }
    if(ser === lastSerialized) return;
    // keep the previous good copy so an accidental "New Character" is recoverable
    const prev = lsGet(KEY);
    const ok = lsSet(KEY, ser);
    if(ok){
      if(prev && prev !== ser) lsSet(BACKUP_KEY, prev);
      lastSerialized = ser;
    }
    stamp(ok);
  }

  function restore(){
    const stored = lsGet(KEY);
    if(!stored){ ready = true; return; }
    try {
      loadData(JSON.parse(stored));
      // other panels (profile pic, infusions, crafting…) refresh on file loads
      const fi = document.getElementById('fileInput');
      if(fi) fi.dispatchEvent(new Event('change'));
      lastSerialized = stored;
      ready = true;
      if(typeof showToast === 'function') showToast('✓ Restored your auto-saved character.');
      stamp(true);
    } catch(e){
      // don't overwrite the stored copy if it failed to load
      lsSet(KEY + '_failed', stored);
      ready = false;
      if(typeof showToast === 'function') showToast('Could not restore the auto-save — use Load File. (Auto-save paused.)', 'warn');
    }
  }

  function init(){
    const toolbar = document.getElementById('toolbar');
    if(toolbar){
      const s = document.createElement('span');
      s.id = 'autosaveStamp';
      s.style.cssText = 'font-size:11px; color:var(--gold-light); opacity:0.85;';
      toolbar.insertBefore(s, document.getElementById('btnOpenDmMode') || null);
    }
    restore();
    setInterval(save, INTERVAL_MS);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden) save(); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
