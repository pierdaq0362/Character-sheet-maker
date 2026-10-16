// ============================================================================
// Dice roller — toolbar "🎲 Dice" panel (d4–d100, count, modifier,
// advantage/disadvantage, roll history) plus click-to-roll on the sheet:
// ability modifiers, saves, skills and initiative.
//   Click = roll   ·   Shift+click = advantage   ·   Alt/Ctrl+click = disadvantage
// Self-contained: doesn't touch js/app.js.
// ============================================================================
(function(){
  const SIDES = [4,6,8,10,12,20,100];
  const MAX_LOG = 40;
  let mode = 'normal';
  const log = [];

  const css = document.createElement('style');
  css.textContent = `
    [data-mod], [data-save], [data-skillmod], #initiative{cursor:pointer;}
    [data-mod]:hover, [data-save]:hover, [data-skillmod]:hover, #initiative:hover{text-decoration:underline dotted;}
    .dice-bar{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;}
    .dice-bar .btn{min-width:54px;}
    .dice-inputs{display:flex; gap:8px; margin-bottom:10px;}
    .dice-inputs label{font-size:11px; display:flex; flex-direction:column; gap:2px; flex:1;}
    .dice-inputs input{width:100%;}
    .dice-mode{display:flex; gap:12px; font-size:12.5px; margin-bottom:10px;}
    .dice-big{border:1px solid var(--line); border-radius:8px; background:#fffaf0; padding:10px; margin-bottom:12px; text-align:center; min-height:64px;}
    .dice-big .num{font-family:'Cinzel',serif; font-size:34px; font-weight:800; line-height:1.1;}
    .dice-big .det{font-size:11.5px; color:var(--ink-soft); font-family:'JetBrains Mono',monospace;}
    .dice-big.crit .num{color:#2e7d32;} .dice-big.fumble .num{color:var(--burgundy);}
    .dice-log-row{display:flex; gap:8px; font-size:12px; padding:4px 0; border-bottom:1px dashed var(--line);}
    .dice-log-row .dl-label{flex:1 1 auto; font-weight:700;}
    .dice-log-row .dl-det{color:var(--ink-soft); font-family:'JetBrains Mono',monospace; font-size:10.5px;}
    .dice-log-row .dl-tot{font-weight:800; min-width:34px; text-align:right;}
    #diceFloat{
      position:fixed; left:50%; top:78px; transform:translateX(-50%); z-index:700;
      background:var(--ink); color:var(--parchment); border:1px solid var(--gold);
      border-radius:10px; padding:10px 18px; text-align:center; display:none;
      box-shadow:0 6px 20px rgba(0,0,0,0.35); max-width:92vw; pointer-events:none;
    }
    #diceFloat .fl-label{font-size:12px; color:var(--gold-light);}
    #diceFloat .fl-num{font-family:'Cinzel',serif; font-size:32px; font-weight:800; line-height:1.1;}
    #diceFloat .fl-det{font-size:11px; opacity:0.8; font-family:'JetBrains Mono',monospace;}
    #diceFloat.crit .fl-num{color:#8be28b;} #diceFloat.fumble .fl-num{color:#ff9d8f;}
  `;
  document.head.appendChild(css);

  function rnd(n){ return Math.floor(Math.random()*n)+1; }

  // returns {total, rolls, kept, text, nat}
  function rollDice(count, sides, modifier, m){
    count = Math.max(1, Math.min(20, count|0 || 1));
    modifier = modifier|0;
    const single20 = (sides === 20 && count === 1 && m !== 'normal');
    let rolls, kept, text;
    if(single20){
      rolls = [rnd(20), rnd(20)];
      kept = m === 'adv' ? Math.max(...rolls) : Math.min(...rolls);
      text = `d20 (${m==='adv'?'adv':'dis'}: ${rolls.join(', ')} → ${kept})`;
    } else {
      rolls = Array.from({length:count}, ()=>rnd(sides));
      kept = rolls.reduce((a,b)=>a+b, 0);
      text = `${count}d${sides} [${rolls.join(', ')}]`;
    }
    const total = kept + modifier;
    const nat = (sides === 20 && count === 1) ? (single20 ? kept : rolls[0]) : null;
    if(modifier) text += ` ${modifier>0?'+':'−'} ${Math.abs(modifier)}`;
    return { total, rolls, kept, text, nat };
  }

  function record(label, res){
    log.unshift({ label, total: res.total, text: res.text, nat: res.nat });
    if(log.length > MAX_LOG) log.pop();
    showResult(label, res);
    renderLog();
  }

  let floatTimer;
  function showResult(label, res){
    let f = document.getElementById('diceFloat');
    if(!f){ f = document.createElement('div'); f.id = 'diceFloat'; document.body.appendChild(f); }
    f.className = res.nat === 20 ? 'crit' : (res.nat === 1 ? 'fumble' : '');
    f.innerHTML = `<div class="fl-label">${label}</div><div class="fl-num">${res.total}</div><div class="fl-det">${res.text}${res.nat===20?' — NATURAL 20!':res.nat===1?' — natural 1':''}</div>`;
    f.style.display = 'block';
    clearTimeout(floatTimer);
    floatTimer = setTimeout(()=>{ f.style.display = 'none'; }, 3800);
    const big = document.getElementById('diceBig');
    if(big){
      big.className = 'dice-big' + (res.nat===20 ? ' crit' : res.nat===1 ? ' fumble' : '');
      big.innerHTML = `<div class="num">${res.total}</div><div class="det">${label} — ${res.text}</div>`;
    }
  }

  function renderLog(){
    const el = document.getElementById('diceLog');
    if(!el) return;
    el.innerHTML = log.length ? log.map(r=>`<div class="dice-log-row"><span class="dl-label">${r.label}</span><span class="dl-det">${r.text}</span><span class="dl-tot">${r.total}</span></div>`).join('')
      : '<div style="font-size:12px; color:var(--ink-soft);">No rolls yet.</div>';
  }

  function readNum(id, def){
    const el = document.getElementById(id);
    const n = el ? parseInt(el.value,10) : NaN;
    return isNaN(n) ? def : n;
  }

  function buildPanel(){
    const o = document.createElement('div');
    o.id = 'diceOverlay'; o.className = 'spellbook-overlay'; o.style.display = 'none';
    o.innerHTML = `
      <aside class="spellbook-drawer">
        <div class="spellbook-header"><h3>🎲 Dice Roller</h3>
          <button type="button" id="btnCloseDice" class="spell-modal-close" aria-label="Close">✕</button></div>
        <div class="spellbook-list">
          <div class="dice-inputs">
            <label>How many<input type="number" id="diceCount" class="plain-input" min="1" max="20" value="1"></label>
            <label>Modifier<input type="number" id="diceMod" class="plain-input" value="0"></label>
          </div>
          <div class="dice-mode">
            <label><input type="radio" name="diceModeRadio" value="normal" checked> Normal</label>
            <label><input type="radio" name="diceModeRadio" value="adv"> Advantage</label>
            <label><input type="radio" name="diceModeRadio" value="dis"> Disadvantage</label>
          </div>
          <div class="dice-bar">${SIDES.map(s=>`<button type="button" class="btn small" data-die="${s}">d${s}</button>`).join('')}</div>
          <div class="dice-big" id="diceBig"><div class="det">Pick a die to roll. Advantage/disadvantage applies to a single d20.</div></div>
          <div style="display:flex; align-items:center; margin-bottom:4px;">
            <b style="font-size:12px; flex:1;">History</b>
            <button type="button" class="btn small secondary" id="btnClearDice">Clear</button>
          </div>
          <div id="diceLog"></div>
          <p style="font-size:11px; color:var(--ink-soft); margin-top:12px;">Tip: on the sheet, click any ability modifier, save, skill or initiative to roll it. Shift+click = advantage, Alt/Ctrl+click = disadvantage.</p>
        </div>
      </aside>`;
    document.body.appendChild(o);
    o.addEventListener('click', e=>{ if(e.target === o) close(); });
    o.querySelector('#btnCloseDice').addEventListener('click', close);
    o.querySelectorAll('[data-die]').forEach(b=> b.addEventListener('click', ()=>{
      const sides = parseInt(b.dataset.die,10);
      const count = readNum('diceCount', 1);
      const modv = readNum('diceMod', 0);
      const res = rollDice(count, sides, modv, mode);
      record(`${count}d${sides}`, res);
    }));
    o.querySelectorAll('[name="diceModeRadio"]').forEach(r=> r.addEventListener('change', ()=>{ mode = r.value; }));
    o.querySelector('#btnClearDice').addEventListener('click', ()=>{ log.length = 0; renderLog(); });
    renderLog();
  }
  function open(){ document.getElementById('diceOverlay').style.display = 'flex'; renderLog(); }
  function close(){ const o = document.getElementById('diceOverlay'); if(o) o.style.display = 'none'; }

  function labelFor(el){
    try {
      if(el.dataset.mod){ const a = ABILITIES.find(x=>x.key===el.dataset.mod); return `${a?a.name:el.dataset.mod} check`; }
      if(el.dataset.save){ const a = ABILITIES.find(x=>x.key===el.dataset.save); return `${a?a.name:el.dataset.save} save`; }
      if(el.dataset.skillmod){ const s = SKILLS.find(x=>x.key===el.dataset.skillmod); return s ? s.name : el.dataset.skillmod; }
    } catch(e){}
    return el.id === 'initiative' ? 'Initiative' : 'Roll';
  }

  function init(){
    const toolbar = document.getElementById('toolbar');
    const dmBtn = document.getElementById('btnOpenDmMode');
    const btn = document.createElement('button');
    btn.className = 'btn secondary'; btn.id = 'btnOpenDice'; btn.type = 'button'; btn.textContent = '🎲 Dice';
    if(toolbar) toolbar.insertBefore(btn, dmBtn || null);
    buildPanel();
    btn.addEventListener('click', open);
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape') close(); });

    document.addEventListener('click', e=>{
      const el = e.target.closest && e.target.closest('[data-mod],[data-save],[data-skillmod],#initiative');
      if(!el || !el.closest('#sheet')) return;
      const m = parseInt(el.textContent.replace('−','-'), 10);
      const modv = isNaN(m) ? 0 : m;
      const rollMode = e.shiftKey ? 'adv' : (e.altKey || e.ctrlKey) ? 'dis' : mode;
      record(labelFor(el), rollDice(1, 20, modv, rollMode));
    });
    document.querySelectorAll('[data-mod],[data-save],[data-skillmod],#initiative').forEach(el=>{
      el.title = 'Click to roll (Shift = advantage, Alt = disadvantage)';
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
