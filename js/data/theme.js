// ============================================================================
// Theme + mobile pass — 🌙/☀ toggle in the toolbar (remembers your choice,
// follows your device's light/dark setting on first visit) and phone-friendly
// sizing: bigger tap targets, 16px inputs (no iOS zoom), wrapping toolbar,
// full-width drawers. Self-contained: all rules are injected from here.
// ============================================================================
(function(){
  const KEY = 'dnd5e_theme_v1';
  const root = document.documentElement;
  function get(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function set(v){ try { localStorage.setItem(KEY, v); } catch(e){} }
  function systemDark(){ return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
  function current(){ const s = get(); return s || (systemDark() ? 'dark' : 'light'); }
  function apply(t){
    root.setAttribute('data-theme', t);
    const b = document.getElementById('btnTheme');
    if(b){ b.textContent = t === 'dark' ? '☀ Light' : '🌙 Dark'; b.title = 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' mode'; }
    let m = document.querySelector('meta[name="theme-color"]');
    if(!m){ m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = t === 'dark' ? '#14110c' : '#2b2419';
  }
  apply(current()); // before first paint where possible

  const css = document.createElement('style');
  css.textContent = `
    html[data-theme="dark"]{
      --parchment:#1c1812; --parchment-dark:#26211a; --parchment-darker:#312a20;
      --ink:#ece2cb; --ink-soft:#bdb29a; --line:#4a4030; --shadow:rgba(0,0,0,0.55);
      --gold:#c99a49; --gold-light:#dcb264; --forest:#5d7a63;
      --burgundy:#a04848; --burgundy-dark:#7c3434;
      --surface:#2b251c; --surface-2:#352d22; --surface-t:rgba(43,37,28,.6);
      --highlight:#4a3b1a; --bad-bg:#4a2523; --good-bg:#2a3a2c; --track:#3d3426;
      color-scheme:dark;
    }
    html[data-theme="dark"] body{
      background: radial-gradient(ellipse at top left, rgba(255,255,255,0.03), transparent 60%), var(--parchment);
    }
    /* dark "chrome" bars: keep them dark with light text instead of inverting */
    html[data-theme="dark"] #toolbar,
    html[data-theme="dark"] .toast,
    html[data-theme="dark"] .spellbook-header,
    html[data-theme="dark"] .dm-mode-topbar,
    html[data-theme="dark"] #diceFloat{ background:#0e0c08; color:#efe4c8; }
    html[data-theme="dark"] .card h2{ background:#0e0c08; color:#efe4c8; }
    html[data-theme="dark"] .btn, html[data-theme="dark"] .banner{ color:#f1e6ce; }
    html[data-theme="dark"] .btn.secondary{ color:#efe4c8; border-color:#6b6250; }
    html[data-theme="dark"] #choicesCard h2{ background:var(--forest); }
    html[data-theme="dark"] input, html[data-theme="dark"] textarea, html[data-theme="dark"] select{ color:var(--ink); }
    html[data-theme="dark"] ::placeholder{ color:#8a806b; }
    html[data-theme="dark"] .banner input, html[data-theme="dark"] .banner .char-name{ color:#fbf3e2; }
    html[data-theme="dark"] .spell-modal-overlay, html[data-theme="dark"] .spellbook-overlay{ background:rgba(0,0,0,0.65); }
    @media print{
      html[data-theme="dark"]{ --parchment:#f1e6ce; --ink:#2b2419; }
    }

    html[data-theme="dark"] .spellbook-header .spell-modal-close{ color:#efe4c8; }
    #btnTheme{ white-space:nowrap; }

    /* ---------- mobile ---------- */
    @media (max-width:700px){
      #toolbar{ flex-wrap:wrap; gap:6px; padding:8px 10px; }
      #toolbar .title{ flex:1 0 100%; font-size:15px; }
      #toolbar .btn{ flex:1 1 calc(50% - 6px); min-height:42px; padding:8px 6px; font-size:11px; }
      #toolbar #btnOpenDmMode{ margin-left:0 !important; }
      #autosaveStamp{ flex:1 0 100%; }
      #sheet{ padding-left:8px; padding-right:8px; }
      .banner{ padding:16px 14px 14px; }
      .banner .metarow{ display:grid !important; grid-template-columns:1fr 1fr; gap:8px 10px; }
      .card{ padding:12px 10px; }
      .card h2{ margin:-12px -10px 10px; padding:8px 10px; }
      .spellbook-drawer, .inv-drawer{ width:100vw !important; max-width:100vw; }
      .spell-modal-box, .inv-detail, .ic-form{ max-width:96vw; padding:16px 14px; }
      .currency-row{ grid-template-columns:repeat(3,1fr); }
      .inv-slots{ gap:5px; } .slot{ min-height:62px; }
      .table-scroll, .rows-table{ overflow-x:auto; }
      #toast, .toast{ max-width:94vw; }
    }
    @media (max-width:700px), (pointer:coarse){
      .btn, .btn.small{ min-height:40px; }
      input:not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea{ font-size:16px !important; min-height:38px; }
      input[type=checkbox], input[type=radio]{ width:20px; height:20px; }
      .skill-row, .inv-row, .td-row, .ic-row{ min-height:44px; }
      .inv-row .qty button{ width:30px; height:30px; }
      .spell-modal-close{ min-width:40px; min-height:40px; font-size:20px; }
      .inv-lib-item{ padding:9px 8px; }
      [data-mod], [data-save], [data-skillmod], #initiative{ padding:2px 4px; }
    }
  `;
  document.head.appendChild(css);

  function init(){
    const tb = document.getElementById('toolbar');
    if(tb && !document.getElementById('btnTheme')){
      const b = document.createElement('button');
      b.className = 'btn secondary'; b.id = 'btnTheme'; b.type = 'button';
      tb.insertBefore(b, document.getElementById('btnOpenDmMode') || null);
      b.addEventListener('click', ()=>{ const t = current() === 'dark' ? 'light' : 'dark'; set(t); apply(t); });
    }
    apply(current());
    if(window.matchMedia) try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{ if(!get()) apply(current()); }); } catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
