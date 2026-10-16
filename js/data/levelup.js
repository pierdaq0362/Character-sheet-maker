// ============================================================================
// Level-up helper — toolbar "⬆ Level Up" button. Shows what the next level
// gives you (features, proficiency bonus, HP, spell slots, ASI/subclass),
// then bumps the level and opens the Choices panel for HP roll / ASI picks.
// Self-contained: uses ACTIVE, applyBuild() etc. from js/app.js.
// ============================================================================
(function(){

  function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function slotText(cls, from, to){
    const a = cls.slots[from] || {cantrips:0, slots:{}};
    const b = cls.slots[to] || {cantrips:0, slots:{}};
    const parts = [];
    if((b.cantrips||0) > (a.cantrips||0)) parts.push(`Cantrips known: ${a.cantrips||0} → ${b.cantrips}`);
    for(let l=1; l<=9; l++){
      const x = (a.slots && a.slots[l]) || 0, y = (b.slots && b.slots[l]) || 0;
      if(x !== y) parts.push(`Level ${l} slots: ${x} → ${y}`);
    }
    return parts;
  }

  function close(){ const o = document.getElementById('levelUpOverlay'); if(o) o.remove(); }

  function doLevelUp(to){
    const lvlInput = document.getElementById('buildLevel');
    if(lvlInput) lvlInput.value = to;
    applyBuild();
    const card = document.getElementById('choicesCard');
    if(card){
      card.style.display = '';
      card.scrollIntoView({behavior:'smooth', block:'start'});
    }
    if(typeof showToast === 'function') showToast(`Now level ${to} — make your picks below, then Confirm.`);
  }

  function open(){
    if(typeof ACTIVE === 'undefined' || !ACTIVE.cls){
      if(typeof showToast === 'function') showToast('Pick a race/class/background in the builder and press Apply first.', 'warn');
      return;
    }
    const cls = ACTIVE.cls;
    const from = ACTIVE.level;
    if(from >= 20){
      if(typeof showToast === 'function') showToast('Already level 20 — nothing left to gain!');
      return;
    }
    const to = from + 1;
    const conMod = (typeof currentAbilityMod === 'function') ? currentAbilityMod('con') : 0;
    const avg = Math.floor(cls.hitDie/2) + 1 + conMod;

    const items = [];
    const pbFrom = profBonusFor(`x ${from}`), pbTo = profBonusFor(`x ${to}`);
    if(pbTo !== pbFrom) items.push(`<li><b>Proficiency bonus</b> rises: +${pbFrom} → +${pbTo}</li>`);
    items.push(`<li><b>Hit points:</b> roll 1d${cls.hitDie} + ${conMod} (Con), or take the average — <b>+${Math.max(1,avg)} HP</b>. You choose in the next step.</li>`);

    const feats = (cls.features || []).filter(f => f && f.lvl === to);
    feats.forEach(f=>{
      const text = f.text || '';
      items.push(`<li><b>${f.asi ? 'Ability Score Improvement' : esc(text.split(':')[0])}</b>${f.asi ? ' — +2 to one score, +1 to two, or a feat.' : (text.includes(':') ? ' — ' + esc(text.slice(text.indexOf(':')+1).trim()) : '')}</li>`);
    });
    if(cls.subclassLevel === to && cls.subclassOptions){
      items.push(`<li><b>Subclass:</b> choose one — ${esc(cls.subclassOptions.join(', '))}.</li>`);
    }
    slotText(cls, from, to).forEach(t => items.push(`<li><b>Spellcasting:</b> ${esc(t)}</li>`));

    close();
    const o = document.createElement('div');
    o.id = 'levelUpOverlay'; o.className = 'spell-modal-overlay';
    o.innerHTML = `
      <div class="spell-modal-box">
        <button type="button" class="spell-modal-close" id="btnLevelUpClose" aria-label="Close">✕</button>
        <div class="spell-modal-kicker">${esc(cls.name)}</div>
        <h3>⬆ Level ${from} → ${to}</h3>
        <div class="spell-modal-body"><ul style="padding-left:18px; margin:8px 0 14px; line-height:1.5;">${items.join('')}</ul></div>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button type="button" class="btn small secondary" id="btnLevelUpCancel">Not yet</button>
          <button type="button" class="btn small" id="btnLevelUpGo">Level up to ${to}</button>
        </div>
      </div>`;
    document.body.appendChild(o);
    o.addEventListener('click', e=>{ if(e.target === o) close(); });
    o.querySelector('#btnLevelUpClose').addEventListener('click', close);
    o.querySelector('#btnLevelUpCancel').addEventListener('click', close);
    o.querySelector('#btnLevelUpGo').addEventListener('click', ()=>{ close(); doLevelUp(to); });
  }

  function init(){
    const toolbar = document.getElementById('toolbar');
    const btn = document.createElement('button');
    btn.className = 'btn secondary'; btn.id = 'btnLevelUp'; btn.type = 'button'; btn.textContent = '⬆ Level Up';
    if(toolbar) toolbar.insertBefore(btn, document.getElementById('btnOpenDmMode') || null);
    btn.addEventListener('click', open);
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape') close(); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
