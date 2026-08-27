// ============================================================================
// DM Mode — password gate (cosmetic only, NOT real security — this is a
// static site, anyone can read this file), DM notes (in-memory, never
// saved), and an encounter manager backed by a small monster library below.
// Self-contained: doesn't touch js/app.js.
// ============================================================================

const DM_PASSWORD = "16112000"; // change this to whatever you want

const MONSTER_LIBRARY = {
  goblin: {
    name: "Goblin", size: "Small", type: "humanoid (goblinoid)", alignment: "neutral evil", cr: "1/4",
    ac: 15, hp: 7, hitDice: "2d6", speed: "30 ft.",
    abilities: { str:8, dex:14, con:10, int:10, wis:8, cha:8 },
    skills: "Stealth +6", senses: "darkvision 60 ft., passive Perception 9", languages: "Common, Goblin",
    traits: [{ name:"Nimble Escape", text:"Can take the Disengage or Hide action as a bonus action each turn." }],
    actions: [
      { name:"Scimitar", toHit:4, damage:"1d6+2", type:"slashing", text:"Melee Weapon Attack, reach 5 ft., one target." },
      { name:"Shortbow", toHit:4, damage:"1d6+2", type:"piercing", text:"Ranged Weapon Attack, range 80/320 ft., one target." }
    ]
  },
  orc: {
    name: "Orc", size: "Medium", type: "humanoid (orc)", alignment: "chaotic evil", cr: "1/2",
    ac: 13, hp: 15, hitDice: "2d8+6", speed: "30 ft.",
    abilities: { str:16, dex:12, con:16, int:7, wis:11, cha:10 },
    skills: "Intimidation +2", senses: "darkvision 60 ft., passive Perception 10", languages: "Common, Orc",
    traits: [{ name:"Aggressive", text:"Bonus action: move up to speed toward a hostile creature it can see." }],
    actions: [
      { name:"Greataxe", toHit:5, damage:"1d12+3", type:"slashing", text:"Melee Weapon Attack, reach 5 ft., one target." },
      { name:"Javelin", toHit:5, damage:"1d6+3", type:"piercing", text:"Melee or Ranged Weapon Attack, range 30/120 ft., one target." }
    ]
  },
  skeleton: {
    name: "Skeleton", size: "Medium", type: "undead", alignment: "lawful evil", cr: "1/4",
    ac: 13, hp: 13, hitDice: "2d8+4", speed: "30 ft.",
    abilities: { str:10, dex:14, con:15, int:6, wis:8, cha:5 },
    skills: "—", senses: "darkvision 60 ft., passive Perception 9", languages: "understands languages it knew in life but can't speak",
    traits: [
      { name:"Vulnerable / Immune", text:"Vulnerable to bludgeoning damage. Immune to poison damage; immune to the exhaustion and poisoned conditions." }
    ],
    actions: [
      { name:"Shortsword", toHit:4, damage:"1d6+2", type:"piercing", text:"Melee Weapon Attack, reach 5 ft., one target." },
      { name:"Shortbow", toHit:4, damage:"1d6+2", type:"piercing", text:"Ranged Weapon Attack, range 80/320 ft., one target." }
    ]
  },
  bandit: {
    name: "Bandit", size: "Medium", type: "humanoid (any race)", alignment: "any non-lawful", cr: "1/8",
    ac: 12, hp: 11, hitDice: "2d8+2", speed: "30 ft.",
    abilities: { str:11, dex:12, con:12, int:10, wis:10, cha:10 },
    skills: "—", senses: "passive Perception 10", languages: "any one language (usually Common)",
    traits: [],
    actions: [
      { name:"Scimitar", toHit:3, damage:"1d6+1", type:"slashing", text:"Melee Weapon Attack, reach 5 ft., one target." },
      { name:"Light Crossbow", toHit:3, damage:"1d8+1", type:"piercing", text:"Ranged Weapon Attack, range 80/320 ft., one target." }
    ]
  },
  wolf: {
    name: "Wolf", size: "Medium", type: "beast", alignment: "unaligned", cr: "1/4",
    ac: 13, hp: 11, hitDice: "2d8+2", speed: "40 ft.",
    abilities: { str:12, dex:15, con:12, int:3, wis:12, cha:6 },
    skills: "Perception +3, Stealth +4", senses: "passive Perception 13", languages: "—",
    traits: [
      { name:"Keen Hearing and Smell", text:"Advantage on Wisdom (Perception) checks that rely on hearing or smell." },
      { name:"Pack Tactics", text:"Advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 ft. of it and not incapacitated." }
    ],
    actions: [
      { name:"Bite", toHit:4, damage:"2d4+2", type:"piercing", text:"Melee Weapon Attack, reach 5 ft., one target." },
      { name:"Bite — Knockdown Save", save:{ ability:"Str", dc:11 }, text:"On a hit from Bite, target must succeed or be knocked prone." }
    ]
  },
  giantRat: {
    name: "Giant Rat", size: "Small", type: "beast", alignment: "unaligned", cr: "1/8",
    ac: 12, hp: 7, hitDice: "2d6", speed: "30 ft.",
    abilities: { str:7, dex:15, con:11, int:2, wis:10, cha:4 },
    skills: "—", senses: "darkvision 60 ft., passive Perception 10", languages: "—",
    traits: [
      { name:"Keen Smell", text:"Advantage on Wisdom (Perception) checks that rely on smell." },
      { name:"Pack Tactics", text:"Advantage on an attack roll against a creature if at least one of the rat's allies is within 5 ft. of it and not incapacitated." }
    ],
    actions: [
      { name:"Bite", toHit:4, damage:"1d4+2", type:"piercing", text:"Melee Weapon Attack, reach 5 ft., one target." }
    ]
  },
  zombie: {
    name: "Zombie", size: "Medium", type: "undead", alignment: "neutral evil", cr: "1/4",
    ac: 8, hp: 22, hitDice: "3d8+9", speed: "20 ft.",
    abilities: { str:13, dex:6, con:16, int:3, wis:6, cha:5 },
    skills: "Saves: Wis +0", senses: "darkvision 60 ft., passive Perception 8", languages: "understands languages it knew in life but can't speak",
    traits: [{ name:"Undead Fortitude", text:"On damage that would drop it to 0 HP (unless radiant or a crit), Con save DC 5 + damage taken; on a success drops to 1 HP instead." }],
    actions: [
      { name:"Slam", toHit:3, damage:"1d6+1", type:"bludgeoning", text:"Melee Weapon Attack, reach 5 ft., one target." }
    ]
  },
  kobold: {
    name: "Kobold", size: "Small", type: "humanoid (kobold)", alignment: "lawful evil", cr: "1/8",
    ac: 12, hp: 5, hitDice: "2d6-2", speed: "30 ft.",
    abilities: { str:7, dex:15, con:9, int:8, wis:7, cha:8 },
    skills: "—", senses: "darkvision 60 ft., passive Perception 8", languages: "Common, Draconic",
    traits: [
      { name:"Sunlight Sensitivity", text:"Disadvantage on attack rolls and Perception checks that rely on sight in sunlight." },
      { name:"Pack Tactics", text:"Advantage on an attack roll against a creature if at least one of the kobold's allies is within 5 ft. of it and not incapacitated." }
    ],
    actions: [
      { name:"Dagger", toHit:4, damage:"1d4+2", type:"piercing", text:"Melee or Ranged Weapon Attack, range 20/60 ft., one target." },
      { name:"Sling", toHit:4, damage:"1d4+2", type:"bludgeoning", text:"Ranged Weapon Attack, range 30/120 ft., one target." }
    ]
  }
};

(function(){

  function _d(nSides){ return 1 + Math.floor(Math.random() * nSides); }
  function abilityMod(score){ return Math.floor((score-10)/2); }
  function fmtMod(n){ return (n>=0?'+':'') + n; }

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

  // ---------------------------------------------------------------------
  // Password gate
  // ---------------------------------------------------------------------
  function openPasswordModal(){
    document.getElementById('dmPasswordInput').value = '';
    document.getElementById('dmPasswordError').style.display = 'none';
    document.getElementById('dmPasswordOverlay').style.display = 'flex';
    document.getElementById('dmPasswordInput').focus();
  }
  function closePasswordModal(){
    document.getElementById('dmPasswordOverlay').style.display = 'none';
  }
  function trySubmitPassword(){
    const input = document.getElementById('dmPasswordInput');
    if(input.value === DM_PASSWORD){
      closePasswordModal();
      document.getElementById('dmModeOverlay').style.display = 'block';
    } else {
      document.getElementById('dmPasswordError').style.display = 'block';
    }
  }

  // ---------------------------------------------------------------------
  // Encounter state (in-memory only — no persistence, by design)
  // ---------------------------------------------------------------------
  let encounter = []; // { id, monsterId, name, initiative, currentHp, maxHp }
  let currentTurnId = null;

  function addMonster(monsterId){
    const def = MONSTER_LIBRARY[monsterId];
    if(!def) return;
    encounter.push({ id:`${monsterId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, monsterId, name:def.name, initiative:null, currentHp:def.hp, maxHp:def.hp });
    renderEncounter();
  }
  function removeMonster(id){
    encounter = encounter.filter(e => e.id !== id);
    if(currentTurnId === id) currentTurnId = null;
    renderEncounter();
  }
  function clearEncounter(){
    encounter = [];
    currentTurnId = null;
    renderEncounter();
  }
  function rollAllInitiative(){
    encounter.forEach(e=>{
      const def = MONSTER_LIBRARY[e.monsterId];
      const dexMod = def ? abilityMod(def.abilities.dex) : 0;
      e.initiative = _d(20) + dexMod;
    });
    renderEncounter();
  }
  function nextTurn(){
    if(!encounter.length) return;
    const sorted = [...encounter].sort((a,b)=> (b.initiative??-999) - (a.initiative??-999));
    const idx = sorted.findIndex(e => e.id === currentTurnId);
    const next = sorted[(idx+1) % sorted.length];
    currentTurnId = next.id;
    renderEncounter();
  }

  function renderEncounter(){
    const container = document.getElementById('encounterList');
    if(!container) return;
    if(!encounter.length){
      container.innerHTML = `<div class="encounter-empty">No monsters in the encounter yet — click "+ Add Monster".</div>`;
      return;
    }
    const sorted = [...encounter].sort((a,b)=> (b.initiative??-999) - (a.initiative??-999));
    container.innerHTML = sorted.map(e=>`
      <div class="encounter-row${e.id===currentTurnId?' current-turn':''}" data-id="${e.id}">
        <span class="er-name">${e.name}</span>
        <label>Init</label><input type="number" class="er-init" value="${e.initiative??''}">
        <label>HP</label><input type="number" class="er-hp" value="${e.currentHp}">/<span>${e.maxHp}</span>
        <button type="button" class="er-remove" title="Remove">✕</button>
      </div>`).join('');

    container.querySelectorAll('.encounter-row').forEach(row=>{
      const id = row.dataset.id;
      const entry = encounter.find(e => e.id === id);
      row.querySelector('.er-name').addEventListener('click', ()=> openMonsterDrawer(entry.monsterId, id));
      row.querySelector('.er-init').addEventListener('input', (e)=>{
        entry.initiative = e.target.value === '' ? null : (parseInt(e.target.value,10) || 0);
      });
      row.querySelector('.er-init').addEventListener('change', renderEncounter);
      row.querySelector('.er-hp').addEventListener('input', (e)=>{
        entry.currentHp = parseInt(e.target.value,10) || 0;
      });
      row.querySelector('.er-remove').addEventListener('click', ()=> removeMonster(id));
    });
  }

  // ---------------------------------------------------------------------
  // Add-monster picker
  // ---------------------------------------------------------------------
  function openMonsterPicker(){
    const listEl = document.getElementById('monsterPickerList');
    listEl.innerHTML = Object.entries(MONSTER_LIBRARY).map(([id, def])=>`
      <div class="summon-picker-item" data-id="${id}">
        <span class="sp-name">${def.name}</span>
        <span class="sp-meta">${def.size} ${def.type} · CR ${def.cr} · ${def.hp} HP</span>
      </div>`).join('');
    listEl.querySelectorAll('.summon-picker-item').forEach(item=>{
      item.addEventListener('click', ()=>{
        addMonster(item.dataset.id);
        closeMonsterPicker();
      });
    });
    document.getElementById('monsterPickerOverlay').style.display = 'flex';
  }
  function closeMonsterPicker(){
    document.getElementById('monsterPickerOverlay').style.display = 'none';
  }

  // ---------------------------------------------------------------------
  // Monster stat block drawer (with roll buttons, mirrors Summons drawer)
  // ---------------------------------------------------------------------
  function buildActionRollHtml(action){
    let html = '';
    if(action.toHit != null){
      const roll = _d(20);
      html += `<div class="roll-line">Attack roll: <span class="roll-total">${roll + action.toHit}</span> (d20: ${roll} + ${action.toHit})</div>`;
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
    return html || `<div class="desc-text">${action.text || 'No roll needed.'}</div>`;
  }

  function openRollModal(title, bodyHtml){
    const overlay = document.getElementById('spellModalOverlay');
    if(!overlay) return;
    document.getElementById('spellModalKicker').textContent = 'Roll';
    document.getElementById('spellModalTitle').textContent = title;
    document.getElementById('spellModalBody').innerHTML = bodyHtml;
    overlay.style.display = 'flex';
  }

  function renderStatBlock(def, entryId){
    const abilities = ['str','dex','con','int','wis','cha'];
    const entry = encounter.find(e => e.id === entryId);
    return `
      <div class="statblock-head"><div class="sb-type">${def.size} ${def.type}, ${def.alignment}</div></div>
      <div class="statblock-core">
        <div><strong>AC</strong> ${def.ac}</div>
        <div><strong>Speed</strong> ${def.speed}</div>
        <div><strong>CR</strong> ${def.cr}</div>
      </div>
      <div class="statblock-hp-row">HP: ${entry ? entry.currentHp : def.hp} / ${def.hp}</div>
      <div class="statblock-abilities">
        ${abilities.map(a=>`<div><div class="ab-label">${a}</div><div class="ab-score">${def.abilities[a]} (${fmtMod(abilityMod(def.abilities[a]))})</div></div>`).join('')}
      </div>
      <div class="statblock-core" style="flex-direction:column; gap:3px;">
        <div><strong>Skills</strong> ${def.skills}</div>
        <div><strong>Senses</strong> ${def.senses}</div>
        <div><strong>Languages</strong> ${def.languages}</div>
      </div>
      ${def.traits.length ? `<div class="statblock-section-title">Traits</div>${def.traits.map(t=>`<div class="statblock-trait"><strong>${t.name}.</strong> ${t.text}</div>`).join('')}` : ''}
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

  function openMonsterDrawer(monsterId, entryId){
    const def = MONSTER_LIBRARY[monsterId];
    if(!def) return;
    document.getElementById('monsterDrawerTitle').textContent = def.name;
    const body = document.getElementById('monsterDrawerBody');
    body.innerHTML = renderStatBlock(def, entryId);
    body.querySelectorAll('.statblock-action').forEach(row=>{
      const idx = parseInt(row.dataset.actionIdx, 10);
      row.querySelector('.sa-roll').addEventListener('click', ()=>{
        openRollModal(def.name, buildActionRollHtml(def.actions[idx]));
      });
    });
    document.getElementById('monsterDrawerOverlay').style.display = 'flex';
  }
  function closeMonsterDrawer(){
    document.getElementById('monsterDrawerOverlay').style.display = 'none';
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------
  function init(){
    const openBtn = document.getElementById('btnOpenDmMode');
    if(openBtn) openBtn.addEventListener('click', openPasswordModal);

    const pwClose = document.getElementById('dmPasswordClose');
    const pwSubmit = document.getElementById('dmPasswordSubmit');
    const pwOverlay = document.getElementById('dmPasswordOverlay');
    const pwInput = document.getElementById('dmPasswordInput');
    if(pwClose) pwClose.addEventListener('click', closePasswordModal);
    if(pwSubmit) pwSubmit.addEventListener('click', trySubmitPassword);
    if(pwOverlay) pwOverlay.addEventListener('click', (e)=>{ if(e.target===pwOverlay) closePasswordModal(); });
    if(pwInput) pwInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') trySubmitPassword(); });

    const closeDm = document.getElementById('btnCloseDmMode');
    if(closeDm) closeDm.addEventListener('click', ()=>{ document.getElementById('dmModeOverlay').style.display = 'none'; });

    const addMonsterBtn = document.getElementById('btnAddMonster');
    const monsterPickerClose = document.getElementById('monsterPickerClose');
    const monsterPickerOverlay = document.getElementById('monsterPickerOverlay');
    if(addMonsterBtn) addMonsterBtn.addEventListener('click', openMonsterPicker);
    if(monsterPickerClose) monsterPickerClose.addEventListener('click', closeMonsterPicker);
    if(monsterPickerOverlay) monsterPickerOverlay.addEventListener('click', (e)=>{ if(e.target===monsterPickerOverlay) closeMonsterPicker(); });

    const drawerClose = document.getElementById('btnCloseMonsterDrawer');
    const drawerOverlay = document.getElementById('monsterDrawerOverlay');
    if(drawerClose) drawerClose.addEventListener('click', closeMonsterDrawer);
    if(drawerOverlay) drawerOverlay.addEventListener('click', (e)=>{ if(e.target===drawerOverlay) closeMonsterDrawer(); });

    const rollAllBtn = document.getElementById('btnRollAllInit');
    const nextTurnBtn = document.getElementById('btnNextTurn');
    const clearBtn = document.getElementById('btnClearEncounter');
    if(rollAllBtn) rollAllBtn.addEventListener('click', rollAllInitiative);
    if(nextTurnBtn) nextTurnBtn.addEventListener('click', nextTurn);
    if(clearBtn) clearBtn.addEventListener('click', clearEncounter);

    document.addEventListener('keydown', (e)=>{
      if(e.key !== 'Escape') return;
      closeMonsterPicker();
      closeMonsterDrawer();
    });

    renderEncounter();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
