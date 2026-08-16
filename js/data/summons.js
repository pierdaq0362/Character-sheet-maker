// ============================================================================
// Summon stat block library
// Add new creatures here — nothing else needs to change to make them
// available from the "+ Add Summon" picker.
// Ability scores are raw 5e SRD scores; toHit/dc are already-computed
// bonuses from the stat block (not derived from the character sheet).
// ============================================================================

const SUMMON_LIBRARY = {
  pseudodragon: {
    name: "Pseudodragon",
    size: "Tiny", type: "dragon", alignment: "neutral good", cr: "1/4",
    ac: 13, hp: 7, hitDice: "2d4+2", speed: "15 ft., fly 60 ft.",
    abilities: { str:6, dex:15, con:13, int:10, wis:12, cha:10 },
    skills: "Perception +5, Stealth +4",
    senses: "blindsight 10 ft., darkvision 60 ft., passive Perception 15",
    languages: "understands Common and Draconic but can't speak",
    traits: [
      { name:"Keen Senses", text:"Advantage on Wisdom (Perception) checks that rely on sight, hearing, or smell." },
      { name:"Magic Resistance", text:"Advantage on saving throws against spells and other magical effects." },
      { name:"Limited Telepathy", text:"Can telepathically share simple ideas, emotions, and images with a creature within 100 ft. that can understand a language." }
    ],
    actions: [
      { name:"Bite", toHit:4, damage:"1d4+2", type:"piercing", text:"Melee Weapon Attack, reach 5 ft., one target." },
      { name:"Sting", toHit:4, damage:"1d4+2", type:"poison", text:"Melee Weapon Attack, reach 5 ft., one creature." },
      { name:"Sting — Poison Save", save:{ ability:"Con", dc:11 }, text:"On a hit from Sting, target must succeed or be poisoned 1 hour (unconscious too if it fails by 5+)." }
    ]
  },
  imp: {
    name: "Imp",
    size: "Tiny", type: "fiend (devil, shapechanger)", alignment: "lawful evil", cr: "1",
    ac: 13, hp: 10, hitDice: "3d4+3", speed: "20 ft., fly 40 ft.",
    abilities: { str:6, dex:17, con:13, int:11, wis:12, cha:14 },
    skills: "Deception +4, Insight +3, Persuasion +4, Stealth +5",
    senses: "darkvision 120 ft., passive Perception 11",
    languages: "Infernal, Common",
    traits: [
      { name:"Shapechanger", text:"Can polymorph into a rat, raven, or spider, or back into its true form (a bonus action). Stats stay the same in each form except as noted." },
      { name:"Devil's Sight", text:"Magical darkness doesn't impede its darkvision." },
      { name:"Magic Resistance", text:"Advantage on saving throws against spells and other magical effects." }
    ],
    actions: [
      { name:"Sting (bite in beast form)", toHit:5, damage:"1d4+3", type:"piercing", text:"Melee Weapon Attack, reach 5 ft., one target." },
      { name:"Sting — Poison", damage:"3d6", type:"poison", text:"On a hit from Sting, add this poison damage." },
      { name:"Invisibility", text:"The imp and anything it's wearing/carrying turn invisible until it attacks, or as a bonus action to end it." }
    ]
  },
  homunculusServant: {
    name: "Homunculus Servant",
    size: "Tiny", type: "construct", alignment: "neutral", cr: "—",
    ac: 13, hp: "5 + Artificer level + Int modifier", hitDice: "(see HP field — level-scaled, not fixed)", speed: "20 ft., fly 30 ft. (or climb/swim depending on form)",
    abilities: { str:4, dex:15, con:12, int:10, wis:10, cha:7 },
    skills: "—",
    senses: "darkvision 60 ft., passive Perception 10",
    languages: "understands the languages you know but can't speak",
    traits: [
      { name:"Simplified reference", text:"Artificer class feature (Tasha's Cauldron of Everything) — its HP and attack bonus actually scale with your Artificer level and Intelligence modifier. Numbers below assume a rough level 5 Artificer; adjust as needed." },
      { name:"Telepathic Bond", text:"While within 120 ft. of you, you can communicate telepathically and can see/hear through its senses as a bonus action." }
    ],
    actions: [
      { name:"Force-Empowered Rend", toHit:6, damage:"1d4+3", type:"force", text:"Melee Weapon Attack, reach 5 ft., one target. (+prof+Int mod to hit, 1d4+Int mod damage — recompute for your level.)" }
    ]
  },
  giantSpider: {
    name: "Giant Spider",
    size: "Large", type: "beast", alignment: "unaligned", cr: "1",
    ac: 14, hp: 26, hitDice: "4d10+4", speed: "30 ft., climb 30 ft.",
    abilities: { str:14, dex:16, con:12, int:2, wis:11, cha:4 },
    skills: "Stealth +7",
    senses: "blindsight 10 ft., darkvision 60 ft., passive Perception 10",
    languages: "—",
    traits: [
      { name:"Spider Climb", text:"Can climb difficult surfaces, including upside down on ceilings, without needing an ability check." },
      { name:"Web Sense", text:"While in contact with a web, knows the exact location of any other creature in contact with the same web." },
      { name:"Web Walker", text:"Ignores movement restrictions caused by webbing." }
    ],
    actions: [
      { name:"Bite", toHit:5, damage:"1d8+3", type:"piercing", text:"Melee Weapon Attack, reach 5 ft., one creature." },
      { name:"Bite — Poison Save", save:{ ability:"Con", dc:11 }, damage:"2d8", type:"poison", text:"On a hit from Bite, target makes this save; on a fail it takes this poison damage and is poisoned (half damage and no poisoned condition on a success)." },
      { name:"Web (recharge 5–6)", save:{ ability:"Dex", dc:13 }, text:"Ranged, 60/120 ft., one creature. On a failed save the target is restrained by webbing (repeatable escape DC 13 Str check or by dealing 5 damage to the web, AC 10)." }
    ]
  }
};

// ============================================================================
// Summons section UI — active-summons list, add picker, and a stat-block
// drawer with roll buttons. Self-contained like js/data/spells.js: doesn't
// touch js/app.js. Persistence rides on the sheet's existing generic
// [name]-field save/load via the hidden #activeSummonsField input.
// ============================================================================

(function(){

  function _d(nSides){ return 1 + Math.floor(Math.random() * nSides); }

  function rollDiceExpression(expr){
    if(!expr) return null;
    const terms = expr.match(/[+-]?[^+-]+/g) || [];
    let total = 0;
    const parts = [];
    terms.forEach(raw=>{
      const trimmed = raw.trim();
      const sign = trimmed.startsWith('-') ? -1 : 1;
      const term = trimmed.replace(/^[+-]/, '').trim();
      const diceMatch = term.match(/^(\d+)d(\d+)$/i);
      if(diceMatch){
        const n = parseInt(diceMatch[1],10), s = parseInt(diceMatch[2],10);
        const rolls = [];
        for(let i=0;i<n;i++) rolls.push(_d(s));
        const sum = rolls.reduce((a,b)=>a+b,0);
        total += sign*sum;
        parts.push(`${sign<0?'-':''}${n}d${s} [${rolls.join('+')}]`);
      } else if(/^\d+$/.test(term)){
        const val = parseInt(term,10);
        total += sign*val;
        parts.push(`${sign<0?'-':'+'}${val}`);
      } else if(term){
        parts.push(term);
      }
    });
    return { total, breakdown: parts.join(' ') };
  }

  function abilityMod(score){ return Math.floor((score-10)/2); }
  function fmtMod(n){ return (n>=0?'+':'') + n; }

  // ---------------------------------------------------------------------
  // Active-summons state (persisted via the hidden #activeSummonsField
  // input, which the sheet's own generic save/load already picks up)
  // ---------------------------------------------------------------------
  function readActive(){
    const field = document.getElementById('activeSummonsField');
    if(!field || !field.value) return [];
    try {
      const arr = JSON.parse(field.value);
      return Array.isArray(arr) ? arr : [];
    } catch(e){ return []; }
  }
  function writeActive(list){
    const field = document.getElementById('activeSummonsField');
    if(field) field.value = JSON.stringify(list);
  }

  function addSummon(libId){
    const def = SUMMON_LIBRARY[libId];
    if(!def) return;
    const list = readActive();
    const maxHp = typeof def.hp === 'number' ? def.hp : null;
    list.push({ id: `${libId}_${Date.now()}`, libId, currentHp: maxHp });
    writeActive(list);
    renderSummonsList();
    if(typeof showToast === 'function') showToast(`${def.name} added to Summons.`);
  }
  function removeSummon(instanceId){
    const list = readActive().filter(s => s.id !== instanceId);
    writeActive(list);
    renderSummonsList();
  }
  function updateSummonHp(instanceId, hp){
    const list = readActive();
    const entry = list.find(s => s.id === instanceId);
    if(entry){ entry.currentHp = hp; writeActive(list); }
  }

  // ---------------------------------------------------------------------
  // Main-page summons list
  // ---------------------------------------------------------------------
  function renderSummonsList(){
    const container = document.getElementById('summonsList');
    if(!container) return;
    const list = readActive();
    if(!list.length){
      container.innerHTML = `<div class="summons-empty">No summons yet — click "+ Add Summon" (familiar, pet, construct, whatever your table calls it).</div>`;
      return;
    }
    container.innerHTML = list.map(s=>{
      const def = SUMMON_LIBRARY[s.libId];
      if(!def) return '';
      const hpText = (typeof def.hp === 'number') ? `${s.currentHp!=null?s.currentHp:def.hp}/${def.hp} HP` : 'HP varies';
      return `<div class="summon-chip" data-id="${s.id}">
        <div>
          <div class="sc-name">${def.name}</div>
          <div class="sc-meta">${hpText} · AC ${def.ac}</div>
        </div>
        <button type="button" class="sc-remove" title="Remove">✕</button>
      </div>`;
    }).join('');

    container.querySelectorAll('.summon-chip').forEach(chip=>{
      const id = chip.dataset.id;
      chip.addEventListener('click', (e)=>{
        if(e.target.classList.contains('sc-remove')) return;
        openSummonDrawer(id);
      });
      chip.querySelector('.sc-remove').addEventListener('click', (e)=>{
        e.stopPropagation();
        removeSummon(id);
      });
    });
  }

  // ---------------------------------------------------------------------
  // "+ Add Summon" picker
  // ---------------------------------------------------------------------
  function openSummonPicker(){
    const listEl = document.getElementById('summonPickerList');
    listEl.innerHTML = Object.entries(SUMMON_LIBRARY).map(([id, def])=>`
      <div class="summon-picker-item" data-id="${id}">
        <span class="sp-name">${def.name}</span>
        <span class="sp-meta">${def.size} ${def.type} · CR ${def.cr}</span>
      </div>`).join('');
    listEl.querySelectorAll('.summon-picker-item').forEach(item=>{
      item.addEventListener('click', ()=>{
        addSummon(item.dataset.id);
        closeSummonPicker();
      });
    });
    document.getElementById('summonPickerOverlay').style.display = 'flex';
  }
  function closeSummonPicker(){
    document.getElementById('summonPickerOverlay').style.display = 'none';
  }

  // ---------------------------------------------------------------------
  // Stat block drawer + rolling
  // ---------------------------------------------------------------------
  function buildActionRollHtml(def, action){
    let html = '';
    if(action.toHit != null){
      const roll = _d(20);
      const total = roll + action.toHit;
      html += `<div class="roll-line">Attack roll: <span class="roll-total">${total}</span> (d20: ${roll} + ${action.toHit})</div>`;
    }
    if(action.save){
      html += `<div class="roll-line">Target makes a <strong>${action.save.ability} saving throw</strong> (DC ${action.save.dc}).</div>`;
    }
    if(action.damage){
      const result = rollDiceExpression(action.damage);
      if(result){
        html += `<div class="roll-line">Damage (${action.damage}${action.type?`, ${action.type}`:''}): <span class="roll-total">${result.total}</span><br><span class="roll-note" style="margin-top:0;">${result.breakdown}</span></div>`;
      }
    }
    if(action.text) html += `<div class="roll-note">${action.text}</div>`;
    return html || `<div class="desc-text">${action.text || 'No roll needed for this.'}</div>`;
  }

  function renderStatBlock(def, instanceId){
    const abilities = ['str','dex','con','int','wis','cha'];
    const hpRow = (typeof def.hp === 'number')
      ? `<div class="statblock-hp-row">HP:
          <input type="number" id="summonHpInput" min="0" value="${(readActive().find(s=>s.id===instanceId)||{}).currentHp ?? def.hp}">
          / ${def.hp}
        </div>`
      : `<div class="statblock-hp-row">HP: ${def.hp}</div>`;

    return `
      <div class="statblock-head">
        <div class="sb-type">${def.size} ${def.type}, ${def.alignment}</div>
      </div>
      <div class="statblock-core">
        <div><strong>AC</strong> ${def.ac}</div>
        <div><strong>Speed</strong> ${def.speed}</div>
        <div><strong>CR</strong> ${def.cr}</div>
      </div>
      ${hpRow}
      <div class="statblock-abilities">
        ${abilities.map(a=>`<div><div class="ab-label">${a}</div><div class="ab-score">${def.abilities[a]} (${fmtMod(abilityMod(def.abilities[a]))})</div></div>`).join('')}
      </div>
      <div class="statblock-core" style="flex-direction:column; gap:3px;">
        <div><strong>Skills</strong> ${def.skills}</div>
        <div><strong>Senses</strong> ${def.senses}</div>
        <div><strong>Languages</strong> ${def.languages}</div>
      </div>
      <div class="statblock-section-title">Traits</div>
      ${def.traits.map(t=>`<div class="statblock-trait"><strong>${t.name}.</strong> ${t.text}</div>`).join('')}
      <div class="statblock-section-title">Actions</div>
      ${def.actions.map((a,i)=>`
        <div class="statblock-action" data-action-idx="${i}">
          <div class="sa-info">
            <div class="sa-name">${a.name}${a.toHit!=null?` <span style="font-weight:400;color:var(--ink-soft);">(${fmtMod(a.toHit)} to hit)</span>`:''}${a.save?` <span style="font-weight:400;color:var(--ink-soft);">(DC ${a.save.dc} ${a.save.ability})</span>`:''}</div>
            <div class="sa-text">${a.text||''}</div>
          </div>
          <button type="button" class="sa-roll" title="Roll">🎲</button>
        </div>`).join('')}
    `;
  }

  function openSummonDrawer(instanceId){
    const list = readActive();
    const entry = list.find(s => s.id === instanceId);
    if(!entry) return;
    const def = SUMMON_LIBRARY[entry.libId];
    if(!def) return;

    document.getElementById('summonDrawerTitle').textContent = def.name;
    const body = document.getElementById('summonDrawerBody');
    body.innerHTML = renderStatBlock(def, instanceId);

    const hpInput = document.getElementById('summonHpInput');
    if(hpInput){
      hpInput.addEventListener('input', ()=>{
        updateSummonHp(instanceId, parseInt(hpInput.value,10) || 0);
        renderSummonsList();
      });
    }
    body.querySelectorAll('.statblock-action').forEach(row=>{
      const idx = parseInt(row.dataset.actionIdx, 10);
      row.querySelector('.sa-roll').addEventListener('click', ()=>{
        openSpellStyleModal(def.name, buildActionRollHtml(def, def.actions[idx]));
      });
    });

    document.getElementById('summonDrawerOverlay').style.display = 'flex';
  }
  function closeSummonDrawer(){
    document.getElementById('summonDrawerOverlay').style.display = 'none';
    renderSummonsList();
  }

  // Reuses the same modal overlay the Spellbook uses (js/data/spells.js
  // wires #spellModalOverlay's close/backdrop/escape behavior already;
  // this just fills and shows it, same as that file's openSpellModal).
  function openSpellStyleModal(title, bodyHtml){
    const overlay = document.getElementById('spellModalOverlay');
    if(!overlay) return;
    document.getElementById('spellModalKicker').textContent = 'Roll';
    document.getElementById('spellModalTitle').textContent = title;
    document.getElementById('spellModalBody').innerHTML = bodyHtml;
    overlay.style.display = 'flex';
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------
  function init(){
    renderSummonsList();

    const addBtn = document.getElementById('btnAddSummon');
    const pickerClose = document.getElementById('summonPickerClose');
    const pickerOverlay = document.getElementById('summonPickerOverlay');
    if(addBtn) addBtn.addEventListener('click', openSummonPicker);
    if(pickerClose) pickerClose.addEventListener('click', closeSummonPicker);
    if(pickerOverlay) pickerOverlay.addEventListener('click', (e)=>{ if(e.target===pickerOverlay) closeSummonPicker(); });

    const drawerOverlay = document.getElementById('summonDrawerOverlay');
    const drawerClose = document.getElementById('btnCloseSummonDrawer');
    if(drawerClose) drawerClose.addEventListener('click', closeSummonDrawer);
    if(drawerOverlay) drawerOverlay.addEventListener('click', (e)=>{ if(e.target===drawerOverlay) closeSummonDrawer(); });

    document.addEventListener('keydown', (e)=>{
      if(e.key !== 'Escape') return;
      closeSummonPicker();
      closeSummonDrawer();
    });

    // Load File doesn't fire input/change events on restored fields, so
    // re-render shortly after a file is chosen to pick up loaded summons.
    const fileInput = document.getElementById('fileInput');
    if(fileInput) fileInput.addEventListener('change', ()=> setTimeout(renderSummonsList, 400));
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
