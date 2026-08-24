// D&D 5e Character Sheet — application engine
// Reads data from js/data/*.js (must be loaded first) and drives the UI.

const ABILITIES = [
  {key:'str', name:'Strength'},
  {key:'dex', name:'Dexterity'},
  {key:'con', name:'Constitution'},
  {key:'int', name:'Intelligence'},
  {key:'wis', name:'Wisdom'},
  {key:'cha', name:'Charisma'}
];

const SKILLS = [
  {key:'acrobatics', name:'Acrobatics', ab:'dex'},
  {key:'animalHandling', name:'Animal Handling', ab:'wis'},
  {key:'arcana', name:'Arcana', ab:'int'},
  {key:'athletics', name:'Athletics', ab:'str'},
  {key:'deception', name:'Deception', ab:'cha'},
  {key:'history', name:'History', ab:'int'},
  {key:'insight', name:'Insight', ab:'wis'},
  {key:'intimidation', name:'Intimidation', ab:'cha'},
  {key:'investigation', name:'Investigation', ab:'int'},
  {key:'medicine', name:'Medicine', ab:'wis'},
  {key:'nature', name:'Nature', ab:'int'},
  {key:'perception', name:'Perception', ab:'wis'},
  {key:'performance', name:'Performance', ab:'cha'},
  {key:'persuasion', name:'Persuasion', ab:'cha'},
  {key:'religion', name:'Religion', ab:'int'},
  {key:'sleightOfHand', name:'Sleight of Hand', ab:'dex'},
  {key:'stealth', name:'Stealth', ab:'dex'},
  {key:'survival', name:'Survival', ab:'wis'}
];

function mod(score){
  const s = parseInt(score,10);
  if(isNaN(s)) return 0;
  return Math.floor((s-10)/2);
}
function fmt(n){ return (n>=0?'+':'') + n; }

function profBonusFor(classLevelStr){
  const m = (classLevelStr||'').match(/(\d+)/);
  const lvl = m ? parseInt(m[1],10) : 1;
  if(lvl>=17) return 6;
  if(lvl>=13) return 5;
  if(lvl>=9) return 4;
  if(lvl>=5) return 3;
  return 2;
}

// ---------- build ability seals ----------
const abilitiesWrap = document.getElementById('abilitiesWrap');
ABILITIES.forEach(a=>{
  const seal = document.createElement('div');
  seal.className='seal';
  seal.innerHTML = `
    <div class="badge">
      <span class="mod" data-mod="${a.key}">+0</span>
      <span class="score-wrap"><input class="score" type="text" name="score_${a.key}" value="10" maxlength="2"></span>
    </div>
    <div class="info">
      <label>${a.name}<span class="racial-tag" data-racialtag="${a.key}"></span></label>
      <input type="hidden" name="racialBonus_${a.key}" value="0">
      <input type="hidden" name="classBonus_${a.key}" value="0">
      <div class="save-line">
        <input type="checkbox" name="save_prof_${a.key}">
        <span>Save</span>
        <span class="save-mod" data-save="${a.key}">+0</span>
      </div>
    </div>`;
  abilitiesWrap.appendChild(seal);
});

// ---------- build skills ----------
const skillsWrap = document.getElementById('skillsWrap');
SKILLS.forEach(s=>{
  const row = document.createElement('div');
  row.className='skill-row';
  row.innerHTML = `
    <input type="checkbox" name="skill_prof_${s.key}" title="Proficient">
    <input type="checkbox" name="skill_exp_${s.key}" title="Expertise">
    <span class="mod" data-skillmod="${s.key}">+0</span>
    <span>${s.name} <span class="abbr">(${s.ab.toUpperCase()})</span></span>`;
  skillsWrap.appendChild(row);
});







function spellLevelOf(name){
  if(SPELL_LEVELS[name]!==undefined) return SPELL_LEVELS[name];
  for(const listKey in SPELL_LISTS){
    const byLevel = SPELL_LISTS[listKey];
    for(const lvl in byLevel){
      if(byLevel[lvl].includes(name)) return parseInt(lvl,10);
    }
  }
  return 0;
}






function cantripDieCount(level){
  if(level>=17) return 4;
  if(level>=11) return 3;
  if(level>=5) return 2;
  return 1;
}

function spellEffectText(name, level){
  const d = SPELL_DAMAGE[name];
  if(d){
    if(d.cantripScales==='beams'){
      const count = cantripDieCount(level||1);
      return count>1
        ? `${count} beams, 1${d.die} ${d.type} each (spell attack, beams can target separately)`
        : `1${d.die} ${d.type} (spell attack)`;
    }
    if(d.cantripScales){
      const count = cantripDieCount(level||1);
      return `${count}${d.die} ${d.type} ${d.attack ? '(spell attack)' : `(${d.save} save)`}`;
    }
    return `${d.dice} ${d.type}${d.attack ? ' (spell attack)' : d.save ? ` (${d.save} save)` : ''}${d.note ? ' — '+d.note : ''}`;
  }
  return SPELL_DESCRIPTIONS[name] || '';
}



function activeSpellListKey(){
  const classKey = document.getElementById('buildClass') ? document.getElementById('buildClass').value : '';
  return SPELL_LISTS[classKey] ? classKey : null;
}

function populateSpellNameSelect(selectEl, level, preferredName){
  const listKey = activeSpellListKey();
  let options = (listKey && SPELL_LISTS[listKey][level]) ? [...SPELL_LISTS[listKey][level]] : [];
  if(ACTIVE.bg && ACTIVE.bg.guildSpells && ACTIVE.bg.guildSpells[level]){
    options = [...new Set([...options, ...ACTIVE.bg.guildSpells[level]])];
  }
  selectEl.innerHTML = '';
  if(options.length === 0){
    const o = document.createElement('option');
    o.value=''; o.textContent = listKey ? '— no spells at this level —' : '— choose a class above for a spell list —';
    selectEl.appendChild(o);
  } else {
    const blank = document.createElement('option');
    blank.value=''; blank.textContent='— choose a spell —';
    selectEl.appendChild(blank);
    options.forEach(name=>{
      const o = document.createElement('option');
      o.value = name; o.textContent = name;
      if(SPELL_DESCRIPTIONS[name]) o.title = SPELL_DESCRIPTIONS[name];
      selectEl.appendChild(o);
    });
  }
  const custom = document.createElement('option');
  custom.value = CUSTOM_SPELL; custom.textContent = 'Other / custom…';
  selectEl.appendChild(custom);

  if(preferredName && options.includes(preferredName)){
    selectEl.value = preferredName;
  } else if(preferredName){
    selectEl.value = CUSTOM_SPELL;
  } else {
    selectEl.value = '';
  }
}

function makeAttackRow(vals={}){
  const tr = document.createElement('tr');
  if(vals.managedWeapon) tr.dataset.managedWeapon = 'true';
  if(vals.managedCantripAttack) tr.dataset.managedCantripAttack = vals.managedCantripAttack;
  tr.innerHTML = `
    <td><input type="text" class="atk-name" value="${vals.name||''}"></td>
    <td><input type="text" class="atk-bonus" value="${vals.bonus||''}"></td>
    <td><input type="text" class="atk-dmg" value="${vals.dmg||''}"></td>
    <td><button class="btn small danger" type="button" onclick="this.closest('tr').remove()">✕</button></td>`;
  return tr;
}
function makeSpellRow(vals={}){
  const tr = document.createElement('tr');
  if(vals.subclassBonus) tr.dataset.subclassBonus = vals.subclassBonus;
  if(vals.managedCantrip) tr.dataset.managedCantrip = vals.managedCantrip;
  if(vals.managedGuildSpell) tr.dataset.managedGuildSpell = vals.managedGuildSpell;
  const lvl = vals.level!==undefined ? String(vals.level) : '0';
  let opts = '';
  ['C','1','2','3','4','5','6','7','8','9'].forEach(l=>{
    const v = l==='C' ? '0' : l;
    opts += `<option value="${v}" ${v===lvl?'selected':''}>${l}</option>`;
  });
  const customVisible = vals.name && !(SPELL_LISTS[activeSpellListKey()] && (SPELL_LISTS[activeSpellListKey()][lvl]||[]).includes(vals.name));
  tr.innerHTML = `
    <td><select class="spell-level">${opts}</select></td>
    <td>
      <select class="spell-name-select"></select>
      <input type="text" class="spell-name-custom" placeholder="Custom spell name" value="${vals.name||''}" style="${customVisible?'':'display:none'}; margin-top:3px;">
    </td>
    <td style="text-align:center"><input type="checkbox" class="spell-prep" ${vals.prep?'checked':''}></td>
    <td class="spell-effect"><span></span></td>
    <td><input type="text" class="spell-notes" value="${vals.notes||''}"></td>
    <td><button class="btn small danger" type="button" onclick="this.closest('tr').remove(); updatePreparedCounter();">✕</button></td>`;

  const levelSel = tr.querySelector('.spell-level');
  const nameSel = tr.querySelector('.spell-name-select');
  const customInput = tr.querySelector('.spell-name-custom');

  populateSpellNameSelect(nameSel, parseInt(lvl,10), vals.name);
  updateSpellEffect(tr);

  nameSel.addEventListener('change', ()=>{
    if(nameSel.value === CUSTOM_SPELL){
      customInput.style.display='';
      customInput.focus();
    } else {
      customInput.style.display='none';
      customInput.value='';
    }
    updateSpellEffect(tr);
  });
  customInput.addEventListener('input', ()=>updateSpellEffect(tr));
  levelSel.addEventListener('change', ()=>{
    populateSpellNameSelect(nameSel, parseInt(levelSel.value,10), null);
    customInput.style.display='none';
    customInput.value='';
    updateSpellEffect(tr);
    const prepBox = tr.querySelector('.spell-prep');
    if(prepBox.checked && countsTowardPrepared(tr)){
      const limit = preparedLimit();
      if(limit !== null && countPreparedSpells() > limit){
        prepBox.checked = false;
        flashPreparedWarning(limit);
      }
    }
    updatePreparedCounter();
  });

  return tr;
}
function currentRowSpellName(tr){
  const nameSel = tr.querySelector('.spell-name-select');
  const customInput = tr.querySelector('.spell-name-custom');
  return (nameSel.value === CUSTOM_SPELL) ? customInput.value : nameSel.value;
}
function updateSpellEffect(tr){
  const name = currentRowSpellName(tr);
  const span = tr.querySelector('.spell-effect span');
  if(span) span.textContent = name ? spellEffectText(name, (typeof ACTIVE!=='undefined' && ACTIVE.level) || 1) : '';
}
function refreshAllSpellEffects(){
  spellsBody.querySelectorAll('tr').forEach(updateSpellEffect);
}
function refreshAllSpellNameOptions(){
  spellsBody.querySelectorAll('tr').forEach(tr=>{
    const nameSel = tr.querySelector('.spell-name-select');
    const levelSel = tr.querySelector('.spell-level');
    const customInput = tr.querySelector('.spell-name-custom');
    const current = (nameSel.value===CUSTOM_SPELL) ? customInput.value : nameSel.value;
    populateSpellNameSelect(nameSel, parseInt(levelSel.value,10), current);
    customInput.style.display = (nameSel.value===CUSTOM_SPELL) ? '' : 'none';
  });
}

const attacksBody = document.querySelector('#attacksTable tbody');
const spellsBody = document.querySelector('#spellsTable tbody');
document.getElementById('addAttack').onclick = ()=> attacksBody.appendChild(makeAttackRow());
document.getElementById('addSpell').onclick = ()=> spellsBody.appendChild(makeSpellRow());
for(let i=0;i<3;i++) attacksBody.appendChild(makeAttackRow());

// ---------- Actions / Bonus Actions tables ----------
const RECHARGE_LABELS = {atwill:'At-will', short:'Short Rest', long:'Long Rest'};
function makeActionRow(vals={}){
  const tr = document.createElement('tr');
  if(vals.universalAction) tr.dataset.universalAction = vals.universalAction;
  if(vals.managedSubclassAction) tr.dataset.managedSubclassAction = vals.managedSubclassAction;
  if(vals.managedSubclassBonusAction) tr.dataset.managedSubclassBonusAction = vals.managedSubclassBonusAction;
  const limited = !!vals.limited;
  const max = vals.max!==undefined && vals.max!==null ? vals.max : '';
  const current = vals.current!==undefined && vals.current!==null ? vals.current : max;
  const recharge = vals.recharge || 'long';
  tr.innerHTML = `
    <td><input type="text" class="act-name" value="${(vals.name||'').replace(/"/g,'&quot;')}" placeholder="e.g. Second Wind"></td>
    <td style="text-align:center"><input type="checkbox" class="act-limited" ${limited?'checked':''}></td>
    <td>
      <span class="uses-tracker" style="${limited?'':'display:none'}">
        <input type="number" class="act-uses-current mono" min="0" value="${current}">
        <span class="uses-sep">/</span>
        <input type="number" class="act-uses-max mono" min="0" value="${max}">
        <button type="button" class="btn small secondary uses-reset" title="Reset to max">↺</button>
      </span>
    </td>
    <td>
      <select class="act-recharge" style="${limited?'':'display:none'}">
        <option value="long" ${recharge==='long'?'selected':''}>Long Rest</option>
        <option value="short" ${recharge==='short'?'selected':''}>Short Rest</option>
        <option value="atwill" ${recharge==='atwill'?'selected':''}>At-will</option>
      </select>
    </td>
    <td><button class="btn small danger" type="button" onclick="this.closest('tr').remove()">✕</button></td>`;

  const limitedCb = tr.querySelector('.act-limited');
  const usesTracker = tr.querySelector('.uses-tracker');
  const rechargeSel = tr.querySelector('.act-recharge');
  limitedCb.addEventListener('change', ()=>{
    usesTracker.style.display = limitedCb.checked ? '' : 'none';
    rechargeSel.style.display = limitedCb.checked ? '' : 'none';
  });
  tr.querySelector('.uses-reset').addEventListener('click', ()=>{
    const maxEl = tr.querySelector('.act-uses-max');
    tr.querySelector('.act-uses-current').value = maxEl.value || '0';
  });
  return tr;
}

const UNIVERSAL_ACTIONS = ['Attack','Cast a Spell','Dash','Disengage','Dodge','Help','Hide','Ready','Search','Use an Object'];

const actionsBody = document.querySelector('#actionsTable tbody');
const bonusActionsBody = document.querySelector('#bonusActionsTable tbody');
document.getElementById('addAction').onclick = ()=> actionsBody.appendChild(makeActionRow());
document.getElementById('addBonusAction').onclick = ()=> bonusActionsBody.appendChild(makeActionRow());
UNIVERSAL_ACTIONS.forEach(name=>{
  const tr = makeActionRow({name, limited:false});
  tr.dataset.universalAction = 'true';
  actionsBody.appendChild(tr);
});

let managedSubclassActionNames = new Set();
let managedSubclassBonusActionNames = new Set();

function syncSubclassActions(){
  const newActionSet = new Set();
  const newBonusSet = new Set();
  if(ACTIVE.cls && ACTIVE.cls.subclasses){
    const subKey = document.querySelector('[name="choice_subclass"]');
    const sub = (subKey && subKey.value) ? ACTIVE.cls.subclasses[subKey.value] : null;
    if(sub){
      (sub.actions||[]).forEach(a=>{ if(a.minLevel<=ACTIVE.level) newActionSet.add(a.name); });
      (sub.bonusActions||[]).forEach(a=>{ if(a.minLevel<=ACTIVE.level) newBonusSet.add(a.name); });
    }
  }
  function syncTable(body, oldSet, newSet, dataAttr, sourceArrFn){
    oldSet.forEach(name=>{
      if(!newSet.has(name)){
        const row = [...body.querySelectorAll('tr')].find(tr=>tr.dataset[dataAttr]===name);
        if(row) row.remove();
      }
    });
    newSet.forEach(name=>{
      const exists = [...body.querySelectorAll('tr')].some(tr=>tr.dataset[dataAttr]===name);
      if(!exists){
        const def = sourceArrFn().find(a=>a.name===name);
        const tr = makeActionRow({name, limited:def?def.limited:false, max:def?def.max:null, current:def?def.max:null, recharge:def?def.recharge:'long'});
        tr.dataset[dataAttr] = name;
        body.appendChild(tr);
      }
    });
  }
  const subKey2 = document.querySelector('[name="choice_subclass"]')?.value;
  const sub2 = (ACTIVE.cls && ACTIVE.cls.subclasses && subKey2) ? ACTIVE.cls.subclasses[subKey2] : null;
  syncTable(actionsBody, managedSubclassActionNames, newActionSet, 'managedSubclassAction', ()=> (sub2 && sub2.actions) || []);
  syncTable(bonusActionsBody, managedSubclassBonusActionNames, newBonusSet, 'managedSubclassBonusAction', ()=> (sub2 && sub2.bonusActions) || []);
  managedSubclassActionNames = newActionSet;
  managedSubclassBonusActionNames = newBonusSet;
}

// spell slots table (fixed levels 1-9)
const slotsBody = document.querySelector('#slotsTable tbody');
for(let lvl=1; lvl<=9; lvl++){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>Level ${lvl}</td>
    <td><input type="text" class="mono" name="slotTotal_${lvl}"></td>
    <td><input type="text" class="mono" name="slotExpended_${lvl}"></td>`;
  slotsBody.appendChild(tr);
}

// ---------- prepared spell limit ----------
function preparedLimit(){
  if(!ACTIVE.cls) return null;
  const abilityKey = document.querySelector('[name="spellAbility"]')?.value;
  if(!abilityKey) return null;
  const mod = currentAbilityMod(abilityKey);
  const classLevelStr = document.querySelector('[name="classLevel"]')?.value || '';
  const lvlMatch = classLevelStr.match(/(\d+)/);
  const lvl = lvlMatch ? parseInt(lvlMatch[1],10) : 1;
  return Math.max(1, mod + Math.floor(lvl/2));
}
function countsTowardPrepared(tr){
  const lvlSel = tr.querySelector('.spell-level');
  if(!lvlSel || lvlSel.value === '0') return false; // cantrips are always available, never "prepared"
  if(tr.dataset.subclassBonus) return false; // always-prepared subclass bonus spells are free
  return true;
}
function countPreparedSpells(){
  return [...spellsBody.querySelectorAll('tr')].filter(tr=>countsTowardPrepared(tr) && tr.querySelector('.spell-prep').checked).length;
}
function updatePreparedCounter(){
  const counterEl = document.getElementById('preparedCounter');
  if(!counterEl) return;
  const limit = preparedLimit();
  if(limit === null){ counterEl.textContent = ''; counterEl.classList.remove('at-limit'); return; }
  const used = countPreparedSpells();
  counterEl.textContent = `${used} / ${limit} spells prepared`;
  counterEl.classList.toggle('at-limit', used >= limit);
}
function flashPreparedWarning(limit){
  const warn = document.getElementById('preparedWarning');
  if(!warn) return;
  warn.textContent = `Limit reached — you can only prepare ${limit} spell${limit===1?'':'s'} at your level. Uncheck one first.`;
  warn.classList.add('show');
  clearTimeout(warn._hideTimer);
  warn._hideTimer = setTimeout(()=>warn.classList.remove('show'), 3500);
}
spellsBody.addEventListener('change', (e)=>{
  if(!e.target.classList.contains('spell-prep')) return;
  const tr = e.target.closest('tr');
  if(e.target.checked && countsTowardPrepared(tr)){
    const limit = preparedLimit();
    if(limit !== null && countPreparedSpells() > limit){
      e.target.checked = false;
      flashPreparedWarning(limit);
    }
  }
  updatePreparedCounter();
});

// ---------- recalculation ----------
function recalc(){
  const scores = {};
  ABILITIES.forEach(a=>{
    const el = document.querySelector(`[name="score_${a.key}"]`);
    const bonusEl = document.querySelector(`[name="racialBonus_${a.key}"]`);
    const classBonusEl = document.querySelector(`[name="classBonus_${a.key}"]`);
    const bonus = bonusEl ? (parseInt(bonusEl.value,10)||0) : 0;
    const classBonus = classBonusEl ? (parseInt(classBonusEl.value,10)||0) : 0;
    const base = parseInt(el.value,10);
    scores[a.key] = mod((isNaN(base)?10:base) + bonus + classBonus);
    document.querySelector(`[data-mod="${a.key}"]`).textContent = fmt(scores[a.key]);
    const tag = document.querySelector(`[data-racialtag="${a.key}"]`);
    if(tag){
      const parts = [];
      if(bonus) parts.push(`${fmt(bonus)} racial`);
      if(classBonus) parts.push(`${fmt(classBonus)} ASI`);
      tag.textContent = parts.length ? `(${parts.join(', ')})` : '';
    }
  });

  const classLevel = document.querySelector('[name="classLevel"]').value;
  const pb = profBonusFor(classLevel);
  document.getElementById('profBonus').textContent = fmt(pb);

  ABILITIES.forEach(a=>{
    const prof = document.querySelector(`[name="save_prof_${a.key}"]`).checked;
    const val = scores[a.key] + (prof?pb:0);
    document.querySelector(`[data-save="${a.key}"]`).textContent = fmt(val);
  });

  let perceptionMod = 0;
  SKILLS.forEach(s=>{
    const prof = document.querySelector(`[name="skill_prof_${s.key}"]`).checked;
    const exp = document.querySelector(`[name="skill_exp_${s.key}"]`).checked;
    let bonus = scores[s.ab];
    if(exp) bonus += pb*2;
    else if(prof) bonus += pb;
    document.querySelector(`[data-skillmod="${s.key}"]`).textContent = fmt(bonus);
    if(s.key==='perception') perceptionMod = bonus;
  });
  document.getElementById('passivePerception').textContent = 10 + perceptionMod;

  document.getElementById('initiative').textContent = fmt(scores.dex);

  const acEl = document.querySelector('[name="ac"]');
  const acManualEl = document.querySelector('[name="acManual"]');
  if(acEl && acManualEl && acManualEl.value !== '1'){
    acEl.value = 10 + scores.dex;
  }

  const spellAbility = document.querySelector('[name="spellAbility"]').value;
  const dcEl = document.getElementById('spellDcAtk');
  if(spellAbility && scores[spellAbility]!==undefined){
    const dc = 8 + pb + scores[spellAbility];
    const atk = pb + scores[spellAbility];
    const lvlMatch = (classLevel||'').match(/(\d+)/);
    const lvlNum = lvlMatch ? parseInt(lvlMatch[1],10) : 1;
    const prepared = Math.max(1, scores[spellAbility] + Math.floor(lvlNum/2));
    dcEl.textContent = `DC ${dc} / ${fmt(atk)} · prepare ${prepared}`;
  } else {
    dcEl.textContent = '— / —';
  }

  updatePreparedCounter();
}

document.getElementById('sheet').addEventListener('input', recalc);
document.getElementById('sheet').addEventListener('change', recalc);

// ---------- character builder: race / class / background data ----------
const AUTO_START = '===== Auto-filled from Race / Class / Background (edit freely) =====';
const AUTO_END   = '===== End auto-filled section — your notes below =====';

function setAutoBlock(textareaEl, content){
  const start = textareaEl.value.indexOf(AUTO_START);
  const end = textareaEl.value.indexOf(AUTO_END);
  const block = `${AUTO_START}\n${content.trim()}\n${AUTO_END}`;
  if(start !== -1 && end !== -1){
    const before = textareaEl.value.slice(0, start);
    const after = textareaEl.value.slice(end + AUTO_END.length);
    textareaEl.value = (before + block + after).trim();
  } else {
    const rest = textareaEl.value.trim();
    textareaEl.value = rest ? `${block}\n\n${rest}` : block;
  }
}








function checkSkill(key, on){
  const el = document.querySelector(`[name="skill_prof_${key}"]`);
  if(el) el.checked = on;
}
function checkSave(key, on){
  const el = document.querySelector(`[name="save_prof_${key}"]`);
  if(el) el.checked = on;
}
function setFieldIfNamed(name, val){
  const el = document.querySelector(`#sheet [name="${name}"]`);
  if(el) el.value = val;
}

function currentAbilityMod(key){
  const scoreEl = document.querySelector(`[name="score_${key}"]`);
  const bonusEl = document.querySelector(`[name="racialBonus_${key}"]`);
  const classBonusEl = document.querySelector(`[name="classBonus_${key}"]`);
  const base = parseInt(scoreEl && scoreEl.value, 10);
  const bonus = bonusEl ? (parseInt(bonusEl.value,10)||0) : 0;
  const classBonus = classBonusEl ? (parseInt(classBonusEl.value,10)||0) : 0;
  return mod((isNaN(base)?10:base) + bonus + classBonus);
}

function skillKeyByName(name){
  const s = SKILLS.find(s=>s.name===name);
  return s ? s.key : '';
}

function buildSelect(name, options, placeholder, titleFn){
  let html = `<select name="${name}">`;
  html += `<option value="">${placeholder||'— choose —'}</option>`;
  options.forEach(o=>{
    const value = (typeof o==='string') ? o : o.value;
    const label = (typeof o==='string') ? o : o.label;
    const t = titleFn ? (titleFn(value)||'') : '';
    html += `<option value="${String(value).replace(/"/g,'&quot;')}"${t?` title="${t.replace(/"/g,'&quot;')}"`:''}>${label}</option>`;
  });
  html += `</select>`;
  return html;
}

const ACTIVE = {race:null, cls:null, bg:null, level:1, asiLevels:[]};
let managedSkillKeys = new Set();

function syncManagedSkills(){
  const newSet = new Set();
  if(ACTIVE.bg) ACTIVE.bg.skills.forEach(k=>newSet.add(k));
  if(ACTIVE.cls){
    for(let i=0;i<ACTIVE.cls.skillChoice.count;i++){
      const el = document.querySelector(`[name="choice_classSkill_${i}"]`);
      if(el && el.value) newSet.add(el.value);
    }
  }
  if(ACTIVE.race){
    const el = document.querySelector('[name="choice_racialSkill"]');
    if(el && el.value) newSet.add(el.value);
  }
  managedSkillKeys.forEach(k=>{ if(!newSet.has(k)) checkSkill(k, false); });
  newSet.forEach(k=>checkSkill(k, true));
  managedSkillKeys = newSet;
}

function recomputeClassBonuses(){
  const totals = {};
  ABILITIES.forEach(a=>totals[a.key]=0);
  (ACTIVE.asiLevels||[]).forEach(lvl=>{
    if(lvl > ACTIVE.level) return;
    const modeEl = document.querySelector(`[name="choice_asi${lvl}_mode"]:checked`);
    const mode = modeEl ? modeEl.value : '';
    if(mode==='two'){
      const a0 = document.querySelector(`[name="choice_asi${lvl}_twoA0"]`).value;
      const a1 = document.querySelector(`[name="choice_asi${lvl}_twoA1"]`).value;
      if(a0) totals[a0] = (totals[a0]||0) + 1;
      if(a1) totals[a1] = (totals[a1]||0) + 1;
    } else if(mode==='one'){
      const a0 = document.querySelector(`[name="choice_asi${lvl}_oneA0"]`).value;
      if(a0) totals[a0] = (totals[a0]||0) + 2;
    }
  });
  ABILITIES.forEach(a=>{
    const el = document.querySelector(`[name="classBonus_${a.key}"]`);
    if(el) el.value = totals[a.key] || 0;
  });
}

function asiSummary(lvl){
  const modeEl = document.querySelector(`[name="choice_asi${lvl}_mode"]:checked`);
  const mode = modeEl ? modeEl.value : '';
  if(mode==='two'){
    const a0 = document.querySelector(`[name="choice_asi${lvl}_twoA0"]`).value;
    const a1 = document.querySelector(`[name="choice_asi${lvl}_twoA1"]`).value;
    if(a0 && a1) return `Ability Score Improvement: +1 ${a0.toUpperCase()}, +1 ${a1.toUpperCase()}.`;
    return 'Ability Score Improvement — not yet chosen.';
  }
  if(mode==='one'){
    const a0 = document.querySelector(`[name="choice_asi${lvl}_oneA0"]`).value;
    if(a0) return `Ability Score Improvement: +2 ${a0.toUpperCase()}.`;
    return 'Ability Score Improvement — not yet chosen.';
  }
  if(mode==='feat'){
    const feat = document.querySelector(`[name="choice_asi${lvl}_feat"]`).value;
    return feat ? `Feat chosen instead of ASI: ${feat}.` : 'Feat instead of ASI — not yet named.';
  }
  return 'Ability Score Improvement — not yet chosen.';
}

function updateAsiVisibility(){
  (ACTIVE.asiLevels||[]).forEach(lvl=>{
    const modeEl = document.querySelector(`[name="choice_asi${lvl}_mode"]:checked`);
    const mode = modeEl ? modeEl.value : '';
    const two = document.getElementById(`asiTwoRow${lvl}`);
    const one = document.getElementById(`asiOneRow${lvl}`);
    const feat = document.getElementById(`asiFeatRow${lvl}`);
    if(two) two.style.display = mode==='two' ? '' : 'none';
    if(one) one.style.display = mode==='one' ? '' : 'none';
    if(feat) feat.style.display = mode==='feat' ? '' : 'none';
  });
}

function updateEquipModeVisibility(){
  const modeEl = document.querySelector('[name="choice_equipMode"]:checked');
  const mode = modeEl ? modeEl.value : 'package';
  const packageRow = document.getElementById('equipPackageRow');
  const goldRow = document.getElementById('equipGoldRow');
  if(packageRow) packageRow.style.display = mode==='package' ? '' : 'none';
  if(goldRow) goldRow.style.display = mode==='gold' ? '' : 'none';
}

function markRequiredFields(){
  document.querySelectorAll('#choicesItems select').forEach(sel=>{
    const row = sel.closest('.choice-row');
    if(row && row.style.display==='none') return;
    sel.classList.toggle('unfilled', !sel.value);
  });
}

function regenerateAutoText(){
  const race = ACTIVE.race, cls = ACTIVE.cls, bg = ACTIVE.bg, level = ACTIVE.level;
  const val = (name)=>{ const el = document.querySelector(`[name="${name}"]`); return el ? el.value : ''; };
  const featureLines = [];

  if(race){
    featureLines.push(`RACE — ${race.name}`);
    const racialSkillKey = val('choice_racialSkill');
    const racialSkillName = racialSkillKey ? SKILLS.find(s=>s.key===racialSkillKey).name : '(not yet chosen)';
    const racialTool = val('choice_racialTool') || '(not yet chosen)';
    race.features.forEach(f=>{
      featureLines.push('• ' + f.replace('{SKILL}', racialSkillName).replace('{TOOL}', racialTool));
    });
    const racialLangs = [];
    for(let i=0;i<race.numRacialLanguages;i++) racialLangs.push(val(`choice_lang_racial_${i}`) || '(not yet chosen)');
    featureLines.push(`Languages: Common, ${race.name}, ${racialLangs.join(', ')}`);
    featureLines.push('');
  }

  if(cls){
    featureLines.push(`CLASS — ${cls.name} (Level ${level})`);
    cls.features.filter(f=>f.lvl<=level).forEach(f=>{
      featureLines.push(`• (Lvl ${f.lvl}) ${f.asi ? asiSummary(f.lvl) : f.text}`);
    });
    const classSkillNames = [];
    for(let i=0;i<cls.skillChoice.count;i++){
      const k = val(`choice_classSkill_${i}`);
      classSkillNames.push(k ? SKILLS.find(s=>s.key===k).name : '(not yet chosen)');
    }
    featureLines.push(`Skill choices: ${classSkillNames.join(', ')}`);
    let subKey = null;
    if(cls.subclassLevel && level >= cls.subclassLevel){
      subKey = val('choice_subclass') || null;
      featureLines.push(`Subclass: ${subKey || '(not yet chosen)'}`);
    }
    featureLines.push('');

    const tbl = cls.slots[level];
    const cantripNames = [];
    for(let i=0;i<tbl.cantrips;i++) cantripNames.push(val(`choice_cantrip_${i}`) || '(not yet chosen)');
    featureLines.push(`Cantrips known: ${cantripNames.join(', ')}`);
    featureLines.push('');

    if(subKey && cls.subclasses && cls.subclasses[subKey]){
      const sub = cls.subclasses[subKey];
      featureLines.push(`SUBCLASS — ${subKey}`);
      featureLines.push(`Tool proficiency: ${sub.tool}`);
      sub.features.filter(f=>f.lvl<=level).forEach(f=>featureLines.push(`• (Lvl ${f.lvl}) ${f.text}`));
      const bonusSoFar = [];
      Object.keys(sub.bonusSpells).forEach(lvlStr=>{
        const lvl = parseInt(lvlStr,10);
        if(lvl<=level) bonusSoFar.push(`Lvl ${lvl}: ${sub.bonusSpells[lvl].join(', ')}`);
      });
      if(bonusSoFar.length) featureLines.push(`Always-prepared bonus spells — ${bonusSoFar.join('; ')} (auto-added to your Spells table).`);
      featureLines.push('');
    }
  }

  if(bg){
    featureLines.push(`BACKGROUND — ${bg.name}`);
    bg.features.forEach(f=>featureLines.push('• ' + f));
    if(bg.cladeOptions){
      featureLines.push(`Research focus: ${val('choice_bgClade') || '(not yet chosen)'}`);
    }
    if(bg.guildSpells){
      featureLines.push(`Simic Guild Spells: added to your spell list (available to know/prepare like any other artificer spell) — ${Object.entries(bg.guildSpells).map(([l,names])=>`Lvl ${l}: ${names.join(', ')}`).join('; ')}.`);
    }
    const bgLangs = [];
    for(let i=0;i<bg.numLanguages;i++) bgLangs.push(val(`choice_lang_bg_${i}`) || '(not yet chosen)');
    featureLines.push(`Languages: ${bgLangs.join(', ')}`);
  }

  const featuresTa = document.querySelector('[name="features"]');
  if(featuresTa) setAutoBlock(featuresTa, featureLines.join('\n'));

  const profsTa = document.querySelector('[name="profsLanguages"]');
  if(profsTa && cls && race){
    const racialTool = val('choice_racialTool') || '(not yet chosen)';
    const racialLangs = [];
    for(let i=0;i<race.numRacialLanguages;i++) racialLangs.push(val(`choice_lang_racial_${i}`) || '(not yet chosen)');
    const bgLangs = [];
    if(bg) for(let i=0;i<bg.numLanguages;i++) bgLangs.push(val(`choice_lang_bg_${i}`) || '(not yet chosen)');
    const subKey2 = (cls.subclassLevel && level >= cls.subclassLevel) ? val('choice_subclass') : null;
    const subTool = (subKey2 && cls.subclasses && cls.subclasses[subKey2]) ? `, ${cls.subclasses[subKey2].tool} (subclass)` : '';
    setAutoBlock(profsTa, [
      `Armor: ${cls.armor}`,
      `Weapons: ${cls.weapons}`,
      `Tools: ${cls.tools}, ${racialTool} (racial)${subTool}`,
      `Saving Throws: ${cls.saves.map(k=>k.toUpperCase()).join(', ')}`,
      `Languages: Common, ${race.name}, ${racialLangs.join(', ')}${bg ? '; '+bgLangs.join(', ')+' (background)' : ''}`
    ].join('\n'));
  }
}

let managedSubclassSpellNames = new Set();

function syncSubclassBonusSpells(){
  const newSet = new Set();
  if(ACTIVE.cls && ACTIVE.cls.subclasses){
    const subKey = document.querySelector('[name="choice_subclass"]');
    const sub = (subKey && subKey.value) ? ACTIVE.cls.subclasses[subKey.value] : null;
    if(sub){
      Object.keys(sub.bonusSpells).forEach(lvlStr=>{
        const lvl = parseInt(lvlStr,10);
        if(lvl <= ACTIVE.level) sub.bonusSpells[lvl].forEach(name=>newSet.add(name));
      });
    }
  }
  managedSubclassSpellNames.forEach(name=>{
    if(!newSet.has(name)){
      const row = [...spellsBody.querySelectorAll('tr')].find(tr=>tr.dataset.subclassBonus===name);
      if(row) row.remove();
    }
  });
  newSet.forEach(name=>{
    const exists = [...spellsBody.querySelectorAll('tr')].some(tr=>tr.dataset.subclassBonus===name);
    if(!exists){
      const lvl = spellLevelOf(name);
      const tr = makeSpellRow({level:String(lvl), name, prep:true, notes:'Subclass bonus — always prepared, free of your prepared-spell count.'});
      tr.dataset.subclassBonus = name;
      spellsBody.appendChild(tr);
    }
  });
  managedSubclassSpellNames = newSet;
}

let managedGuildSpellNames = new Set();

function syncGuildSpellChoices(){
  const newSet = new Set();
  document.querySelectorAll('[name^="choice_guildspell_"]:checked').forEach(cb=>{
    const [name] = cb.value.split('|');
    newSet.add(name);
  });
  managedGuildSpellNames.forEach(name=>{
    if(!newSet.has(name)){
      const row = [...spellsBody.querySelectorAll('tr')].find(tr=>tr.dataset.managedGuildSpell===name);
      if(row) row.remove();
    }
  });
  newSet.forEach(name=>{
    const exists = [...spellsBody.querySelectorAll('tr')].some(tr=>tr.dataset.managedGuildSpell===name);
    if(!exists){
      const lvl = spellLevelOf(name);
      const tr = makeSpellRow({level:String(lvl), name, prep:false, notes:`From ${ACTIVE.bg ? ACTIVE.bg.name : 'background'} bonus spell access.`});
      tr.dataset.managedGuildSpell = name;
      spellsBody.appendChild(tr);
    }
  });
  managedGuildSpellNames = newSet;
}

let managedCantripSpellNames = new Set();
let managedCantripAttackNames = new Set();

function syncCantripChoices(){
  if(!ACTIVE.cls) return;
  const tbl = ACTIVE.cls.slots[ACTIVE.level];
  const chosen = [];
  for(let i=0;i<tbl.cantrips;i++){
    const v = document.querySelector(`[name="choice_cantrip_${i}"]`)?.value;
    if(v) chosen.push(v);
  }
  const newSpellSet = new Set(chosen);
  managedCantripSpellNames.forEach(name=>{
    if(!newSpellSet.has(name)){
      const row = [...spellsBody.querySelectorAll('tr')].find(tr=>tr.dataset.managedCantrip===name);
      if(row) row.remove();
    }
  });
  newSpellSet.forEach(name=>{
    const exists = [...spellsBody.querySelectorAll('tr')].some(tr=>tr.dataset.managedCantrip===name);
    if(!exists){
      const tr = makeSpellRow({level:'0', name, prep:true, notes:'Cantrip — always available, no slot used.'});
      tr.dataset.managedCantrip = name;
      spellsBody.appendChild(tr);
    }
  });
  managedCantripSpellNames = newSpellSet;

  const newAtkSet = new Set(chosen.filter(name=>SPELL_DAMAGE[name] && SPELL_DAMAGE[name].attack));
  managedCantripAttackNames.forEach(name=>{
    if(!newAtkSet.has(name)){
      const row = [...attacksBody.querySelectorAll('tr')].find(tr=>tr.dataset.managedCantripAttack===name);
      if(row) row.remove();
    }
  });
  newAtkSet.forEach(name=>{
    const exists = [...attacksBody.querySelectorAll('tr')].some(tr=>tr.dataset.managedCantripAttack===name);
    if(!exists){
      const dmg = SPELL_DAMAGE[name];
      const spellMod = currentAbilityMod(ACTIVE.cls.spellAbility);
      const pb = profBonusFor(document.querySelector('[name="classLevel"]').value);
      const count = cantripDieCount(ACTIVE.level);
      const tr = makeAttackRow({name, bonus: fmt(pb+spellMod), dmg: `${count}${dmg.die} ${dmg.type}`});
      tr.dataset.managedCantripAttack = name;
      attacksBody.appendChild(tr);
    }
  });
  managedCantripAttackNames = newAtkSet;
}

function syncWeaponAttack(){
  const modeEl = document.querySelector('[name="choice_equipMode"]:checked');
  const mode = modeEl ? modeEl.value : 'package';
  const weaponName = mode==='package' ? document.querySelector('[name="choice_weapon"]')?.value : '';
  const existing = [...attacksBody.querySelectorAll('tr')].find(tr=>tr.dataset.managedWeapon);
  if(!weaponName){
    if(existing) existing.remove();
    return;
  }
  const w = WEAPONS[weaponName] || MARTIAL_WEAPONS[weaponName];
  if(!w) return;
  const strMod = currentAbilityMod('str');
  const dexMod = currentAbilityMod('dex');
  const mod = w.finesse ? Math.max(strMod,dexMod) : (w.ranged ? dexMod : strMod);
  const pb = profBonusFor(document.querySelector('[name="classLevel"]').value);
  const atkBonus = fmt(pb + mod);
  const dmgText = `${w.dmg} ${fmt(mod)} ${w.type}`;
  if(existing){
    existing.querySelector('.atk-name').value = weaponName;
    existing.querySelector('.atk-bonus').value = atkBonus;
    existing.querySelector('.atk-dmg').value = dmgText;
  } else {
    const tr = makeAttackRow({name:weaponName, bonus:atkBonus, dmg:dmgText});
    tr.dataset.managedWeapon = 'true';
    attacksBody.appendChild(tr);
  }
}

function applyHitPointsAndGold(){
  if(!ACTIVE.cls) return;
  const lastConfirmedEl = document.querySelector('[name="lastConfirmedLevel"]');
  const lastConfirmed = parseInt(lastConfirmedEl.value,10) || 0;
  const conMod = currentAbilityMod('con');
  const hpMaxEl = document.querySelector('[name="hpMax"]');
  let hpMax = parseInt(hpMaxEl.value,10);
  if(isNaN(hpMax)) hpMax = 0;
  const average = Math.floor(ACTIVE.cls.hitDie/2) + 1;

  if(lastConfirmed === 0){
    hpMax = ACTIVE.cls.hitDie + conMod;
    for(let l=2; l<=ACTIVE.level; l++){
      const rollEl = document.querySelector(`[name="choice_hproll_${l}"]`);
      const rollVal = (rollEl && rollEl.value) ? (parseInt(rollEl.value,10) || average) : average;
      hpMax += rollVal + conMod;
    }
  } else if(ACTIVE.level > lastConfirmed){
    for(let l=lastConfirmed+1; l<=ACTIVE.level; l++){
      const rollEl = document.querySelector(`[name="choice_hproll_${l}"]`);
      const rollVal = (rollEl && rollEl.value) ? (parseInt(rollEl.value,10) || average) : average;
      hpMax += rollVal + conMod;
    }
  }
  hpMaxEl.value = hpMax;
  if(!document.querySelector('[name="hpCurrent"]').value){
    document.querySelector('[name="hpCurrent"]').value = hpMax;
  }
  lastConfirmedEl.value = ACTIVE.level;

  const modeEl = document.querySelector('[name="choice_equipMode"]:checked');
  const goldAppliedEl = document.querySelector('[name="classGoldApplied"]');
  if(modeEl && modeEl.value==='gold' && goldAppliedEl.value!=='1'){
    const rollEl = document.querySelector('[name="choice_goldroll"]');
    const amount = (rollEl && rollEl.value) ? (parseInt(rollEl.value,10) || ACTIVE.cls.startingGoldAverage) : ACTIVE.cls.startingGoldAverage;
    const gpEl = document.querySelector('[name="gp"]');
    gpEl.value = (parseInt(gpEl.value,10)||0) + amount;
    goldAppliedEl.value = '1';
  }
}

function liveChoiceUpdate(){
  if(!ACTIVE.cls && !ACTIVE.race && !ACTIVE.bg) return;
  updateAsiVisibility();
  updateEquipModeVisibility();
  markRequiredFields();
}

function commitChoices(){
  if(!ACTIVE.cls && !ACTIVE.race && !ACTIVE.bg) return;
  updateAsiVisibility();
  updateEquipModeVisibility();
  markRequiredFields();
  syncManagedSkills();
  recomputeClassBonuses();
  syncSubclassBonusSpells();
  syncSubclassActions();
  syncCantripChoices();
  syncGuildSpellChoices();
  syncWeaponAttack();
  applyHitPointsAndGold();
  regenerateAutoText();
  refreshAllSpellEffects();
  recalc();

  const allDefault = ABILITIES.every(a=>{
    const el = document.querySelector(`[name="score_${a.key}"]`);
    return el && (el.value === '10' || el.value === '');
  });
  showToast(
    allDefault
      ? '✓ Sheet updated — reminder: your ability scores are still all 10, don\'t forget to enter your rolled scores!'
      : '✓ Sheet updated',
    allDefault ? 'warn' : ''
  );

  const choicesCard = document.getElementById('choicesCard');
  if(choicesCard) choicesCard.style.display = 'none';

  const builderCard = document.querySelector('.builder-card');
  const builderBar = document.getElementById('builderCollapsedBar');
  if(builderCard) builderCard.style.display = 'none';
  if(builderBar) builderBar.style.display = '';
}

function showToast(message, variant){
  const toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = message;
  toast.className = 'toast show' + (variant ? ' '+variant : '');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(()=>{ toast.classList.remove('show'); }, variant==='warn' ? 6000 : 3000);
}

function renderChoicesPanel(race, cls, bg, level){
  const container = document.getElementById('choicesItems');
  const card = document.getElementById('choicesCard');
  const sub = document.getElementById('choicesSub');

  const prev = {};
  container.querySelectorAll('[name]').forEach(el=>{
    if(el.type==='radio'){ if(el.checked) prev[el.name]=el.value; }
    else prev[el.name] = el.value;
  });

  let html = '';

  const lastConfirmed = parseInt(document.querySelector('[name="lastConfirmedLevel"]').value, 10) || 0;

  if(lastConfirmed === 0){
    html += `<div class="prompt-banner">
      <div class="choice-group-title">Step 1 — Enter your ability scores</div>
      Roll your six ability scores yourself (4d6 drop lowest, standard array, or point buy — however your table plays) and
      type the results into the <strong>Ability Scores</strong> panel on the left. Everything else on this sheet — HP,
      saving throws, skill bonuses, spell save DC — is calculated from those numbers, so it's worth doing first.
      <div><button class="btn small" type="button" id="btnJumpToScores">↑ Jump to Ability Scores</button></div>
    </div>`;
  }

  if(cls && lastConfirmed > 0 && level > lastConfirmed){
    const newLines = [];
    cls.features.filter(f=>f.lvl>lastConfirmed && f.lvl<=level).forEach(f=>{
      newLines.push(f.asi ? `Lvl ${f.lvl}: Ability Score Improvement` : `Lvl ${f.lvl}: ${f.text.split(':')[0]}`);
    });
    const prevTbl = cls.slots[lastConfirmed], curTbl = cls.slots[level];
    if(prevTbl && curTbl && curTbl.cantrips > prevTbl.cantrips) newLines.push(`+${curTbl.cantrips-prevTbl.cantrips} new cantrip known`);
    if(prevTbl && curTbl && Object.keys(curTbl.slots).length > Object.keys(prevTbl.slots).length) newLines.push('New spell level unlocked — review your prepared spells');
    if(newLines.length){
      html += `<div class="new-since-banner"><div class="choice-group-title">New since level ${lastConfirmed}</div>${newLines.join('<br>')}</div>`;
    }
  }

  if(cls){
    const rollFrom = Math.max(2, lastConfirmed+1);
    if(level >= rollFrom){
      const avg = Math.floor(cls.hitDie/2)+1;
      html += `<div class="choice-group"><div class="choice-group-title">Hit Points — roll for new levels</div>`;
      for(let l=rollFrom; l<=level; l++){
        html += `<div class="choice-row"><label class="inline">Level ${l} (d${cls.hitDie})</label><input type="text" name="choice_hproll_${l}" placeholder="roll, or leave blank for average (${avg})"></div>`;
      }
      html += `</div>`;
    }
  }

  if(cls && lastConfirmed === 0){
    const weaponOptions = Object.keys(WEAPONS);
    const subKeyNow = document.querySelector('[name="choice_subclass"]')?.value;
    if(subKeyNow === 'Battle Smith' && level >= 3) weaponOptions.push(...Object.keys(MARTIAL_WEAPONS));
    html += `<div class="choice-group"><div class="choice-group-title">Starting Equipment</div>
      <div class="choice-row">
        <span class="radio-opt"><input type="radio" name="choice_equipMode" value="package" id="equipModePackage"><label for="equipModePackage">Take equipment package</label></span>
        <span class="radio-opt"><input type="radio" name="choice_equipMode" value="gold" id="equipModeGold"><label for="equipModeGold">Take ${cls.startingGoldFormula} instead</label></span>
      </div>
      <div class="choice-row" id="equipPackageRow" style="display:none;">
        <label class="inline">Starting weapon</label>${buildSelect('choice_weapon', weaponOptions, null, n=>{
          const w = WEAPONS[n]||MARTIAL_WEAPONS[n]; return w ? `${w.dmg} ${w.type}${w.finesse?' (finesse)':''}${w.ranged?' (ranged)':''}` : '';
        })}
      </div>
      <div class="choice-row" id="equipGoldRow" style="display:none;">
        <label class="inline">Gold roll</label><input type="text" name="choice_goldroll" placeholder="roll ${cls.startingGoldFormula}, or leave blank for average (${cls.startingGoldAverage} gp)">
      </div>
    </div>`;
  }

  if(bg){
    html += `<div class="choice-group"><div class="choice-group-title">Background Skills (fixed)</div>
      <div>${bg.skills.map(k=>`<span class="choice-badge">${SKILLS.find(s=>s.key===k).name}</span>`).join('')}</div></div>`;
    if(bg.cladeOptions){
      html += `<div class="choice-group"><div class="choice-group-title">${bg.name} — Research Focus</div>
        <div class="choice-row">${buildSelect('choice_bgClade', bg.cladeOptions)}</div></div>`;
    }
    if(bg.guildSpells){
      const lvlLabel = l => l==='0' || l===0 ? 'Cantrip' : `Lvl ${l}`;
      let rows = '';
      Object.keys(bg.guildSpells).forEach(lvlStr=>{
        bg.guildSpells[lvlStr].forEach(name=>{
          const safeId = `guildspell_${name.replace(/[^a-zA-Z0-9]/g,'')}`;
          rows += `<label class="spell-grant-item" title="${(SPELL_DESCRIPTIONS[name]||'').replace(/"/g,'&quot;')}">
            <input type="checkbox" name="choice_guildspell_${safeId}" value="${name}|${lvlStr}">
            <span class="lvl-tag">${lvlLabel(lvlStr)}</span>
            <span><strong>${name}</strong> — ${spellEffectText(name, level) || 'see hover for details'}</span>
          </label>`;
        });
      });
      html += `<div class="choice-group"><div class="choice-group-title">🎁 ${bg.name} grants bonus spell access</div>
        <div class="choice-static" style="margin-bottom:6px;">Your background adds these to your available spell list — check any you want on
        your sheet. Cantrips are always available; leveled spells still need a free prepared slot like any other spell.</div>
        ${rows}
      </div>`;
    }
  }

  if(cls){
    html += `<div class="choice-group"><div class="choice-group-title">${cls.name} Skill Proficiencies (choose ${cls.skillChoice.count})</div>`;
    for(let i=0;i<cls.skillChoice.count;i++){
      html += `<div class="choice-row"><label class="inline">Choice ${i+1}</label>${buildSelect(`choice_classSkill_${i}`, cls.skillChoice.options.map(name=>({value:skillKeyByName(name), label:name})))}</div>`;
    }
    html += `</div>`;
  }

  if(race){
    html += `<div class="choice-group"><div class="choice-group-title">${race.name} — Tireless Precision</div>
      <div class="choice-row"><label class="inline">Skill</label>${buildSelect('choice_racialSkill', race.skillChoice.options.map(name=>({value:skillKeyByName(name), label:name})))}</div>
      <div class="choice-row"><label class="inline">Tool</label>${buildSelect('choice_racialTool', STANDARD_TOOLS)}</div>
      </div>`;
  }

  if(race || bg){
    html += `<div class="choice-group"><div class="choice-group-title">Languages</div>`;
    if(race){
      for(let i=0;i<race.numRacialLanguages;i++){
        html += `<div class="choice-row"><label class="inline">Racial language ${i+1}</label>${buildSelect(`choice_lang_racial_${i}`, STANDARD_LANGUAGES)}</div>`;
      }
    }
    if(bg){
      for(let i=0;i<bg.numLanguages;i++){
        html += `<div class="choice-row"><label class="inline">Background language ${i+1}</label>${buildSelect(`choice_lang_bg_${i}`, STANDARD_LANGUAGES)}</div>`;
      }
    }
    html += `</div>`;
  }

  if(cls){
    const tbl = cls.slots[level];
    const classKey = document.getElementById('buildClass').value;
    let cantripOpts = (SPELL_LISTS[classKey] && SPELL_LISTS[classKey][0]) || [];
    if(bg && bg.guildSpells && bg.guildSpells[0]){
      cantripOpts = [...new Set([...cantripOpts, ...bg.guildSpells[0]])];
    }
    html += `<div class="choice-group"><div class="choice-group-title">Cantrips Known (choose ${tbl.cantrips})</div>`;
    for(let i=0;i<tbl.cantrips;i++){
      html += `<div class="choice-row"><label class="inline">Cantrip ${i+1}</label>${buildSelect(`choice_cantrip_${i}`, cantripOpts, null, n=>SPELL_DESCRIPTIONS[n])}</div>`;
    }
    html += `</div>`;

    if(cls.subclassLevel && level >= cls.subclassLevel){
      html += `<div class="choice-group"><div class="choice-group-title">${cls.name} Specialist (Subclass)</div>
        <div class="choice-row">${buildSelect('choice_subclass', cls.subclassOptions, null, n=>{
          const sub = cls.subclasses && cls.subclasses[n];
          return sub ? `Tool: ${sub.tool}. Grants bonus always-prepared spells at levels 3/5/9/13/17.` : '';
        })}</div></div>`;
    }
  }

  const asiLevels = cls ? cls.features.filter(f=>f.asi && f.lvl<=level).map(f=>f.lvl) : [];
  asiLevels.forEach(lvl=>{
    html += `<div class="choice-group"><div class="choice-group-title">Ability Score Improvement — Level ${lvl}</div>
      <div class="choice-row">
        <span class="radio-opt"><input type="radio" name="choice_asi${lvl}_mode" value="two" id="asi${lvl}_two"><label for="asi${lvl}_two">+1 to two scores</label></span>
        <span class="radio-opt"><input type="radio" name="choice_asi${lvl}_mode" value="one" id="asi${lvl}_one"><label for="asi${lvl}_one">+2 to one score</label></span>
        <span class="radio-opt"><input type="radio" name="choice_asi${lvl}_mode" value="feat" id="asi${lvl}_feat"><label for="asi${lvl}_feat">Take a feat instead</label></span>
      </div>
      <div class="choice-row" id="asiTwoRow${lvl}" style="display:none;">
        <label class="inline">+1 to</label>${buildSelect(`choice_asi${lvl}_twoA0`, ABILITIES.map(a=>({value:a.key,label:a.name})))}
        <label class="inline">+1 to</label>${buildSelect(`choice_asi${lvl}_twoA1`, ABILITIES.map(a=>({value:a.key,label:a.name})))}
      </div>
      <div class="choice-row" id="asiOneRow${lvl}" style="display:none;">
        <label class="inline">+2 to</label>${buildSelect(`choice_asi${lvl}_oneA0`, ABILITIES.map(a=>({value:a.key,label:a.name})))}
      </div>
      <div class="choice-row" id="asiFeatRow${lvl}" style="display:none;">
        <label class="inline">Feat name</label><input type="text" name="choice_asi${lvl}_feat" placeholder="e.g. Alert, Lucky, War Caster">
      </div>
    </div>`;
  });

  container.innerHTML = html;
  ACTIVE.asiLevels = asiLevels;

  container.querySelectorAll('[name]').forEach(el=>{
    const p = prev[el.name];
    if(p===undefined) return;
    if(el.type==='radio'){ el.checked = (el.value===p); }
    else el.value = p;
  });

  const equipModeRadios = container.querySelectorAll('[name="choice_equipMode"]');
  if(equipModeRadios.length && ![...equipModeRadios].some(r=>r.checked)){
    const pkg = container.querySelector('[name="choice_equipMode"][value="package"]');
    if(pkg) pkg.checked = true;
  }

  updateAsiVisibility();
  updateEquipModeVisibility();
  markRequiredFields();

  sub.textContent = `${cls?cls.name:''} — Level ${level}`;
  card.style.display = (cls||race||bg) ? '' : 'none';
}

function applyBuild(){
  const raceKey = document.getElementById('buildRace').value;
  const classKey = document.getElementById('buildClass').value;
  const bgKey = document.getElementById('buildBackground').value;
  const level = Math.max(1, Math.min(20, parseInt(document.getElementById('buildLevel').value,10) || 1));

  const race = RACES[raceKey] || null;
  const cls = CLASSES[classKey] || null;
  const bg = BACKGROUNDS[bgKey] || null;

  const lastBuildRace = document.querySelector('[name="lastBuildRace"]');
  const lastBuildClass = document.querySelector('[name="lastBuildClass"]');
  const lastBuildBg = document.querySelector('[name="lastBuildBackground"]');
  const isFreshBuild = (lastBuildRace.value !== raceKey || lastBuildClass.value !== classKey || lastBuildBg.value !== bgKey);
  if(isFreshBuild){
    document.querySelector('[name="lastConfirmedLevel"]').value = '0';
    document.querySelector('[name="classGoldApplied"]').value = '0';
  }
  lastBuildRace.value = raceKey; lastBuildClass.value = classKey; lastBuildBg.value = bgKey;

  ACTIVE.race = race; ACTIVE.cls = cls; ACTIVE.bg = bg; ACTIVE.level = level;

  ABILITIES.forEach(a=>{
    const bonusEl = document.querySelector(`[name="racialBonus_${a.key}"]`);
    if(bonusEl) bonusEl.value = (race && race.asi[a.key]) ? race.asi[a.key] : 0;
  });

  if(race){
    setFieldIfNamed('race', race.name);
    setFieldIfNamed('speed', race.speed);
  }

  if(cls){
    setFieldIfNamed('classLevel', `${cls.name} ${level}`);
    setFieldIfNamed('hitDice', `${level}d${cls.hitDie}`);
    cls.saves.forEach(k=>checkSave(k,true));
    setFieldIfNamed('spellClass', cls.name);
    setFieldIfNamed('spellAbility', cls.spellAbility);
    const tbl = cls.slots[level];
    for(let l=1; l<=9; l++){
      const totalEl = document.querySelector(`[name="slotTotal_${l}"]`);
      if(totalEl) totalEl.value = (tbl.slots[l] || '');
    }
  }

  if(bg){
    setFieldIfNamed('background', bg.name);
    const gpEl = document.querySelector('[name="gp"]');
    if(gpEl && !gpEl.value) gpEl.value = bg.startingGp;
    const equipTa = document.querySelector('[name="equipment"]');
    if(equipTa){
      setAutoBlock(equipTa, `${bg.name} starting gear: ${bg.equipment}\n\nPlus your ${cls?cls.name:'class'} starting equipment — pick a weapon or gold below, then Confirm.`);
    }
  }

  renderChoicesPanel(race, cls, bg, level);
  refreshAllSpellNameOptions();
  refreshAllSpellEffects();
  recalc();
}

document.getElementById('btnApplyBuild').onclick = applyBuild;
['buildRace','buildClass','buildBackground'].forEach(id=>{
  document.getElementById(id).addEventListener('change', applyBuild);
});
document.getElementById('choicesItems').addEventListener('change', liveChoiceUpdate);
document.getElementById('choicesItems').addEventListener('click', (e)=>{
  if(e.target && e.target.id==='btnJumpToScores'){
    const el = document.getElementById('abilityScoresCard');
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.add('attention-pulse');
      setTimeout(()=>el.classList.remove('attention-pulse'), 2800);
    }
  }
});
document.getElementById('btnConfirmChoices').addEventListener('click', commitChoices);

// ---------- save / load ----------
function gatherData(){
  const fields = {};
  document.querySelectorAll('#sheet [name]').forEach(el=>{
    if(el.type==='checkbox') fields[el.name] = el.checked;
    else if(el.type==='radio'){ if(el.checked) fields[el.name] = el.value; }
    else fields[el.name] = el.value;
  });
  const attacks = [...attacksBody.querySelectorAll('tr')].map(tr=>({
    name: tr.querySelector('.atk-name').value,
    bonus: tr.querySelector('.atk-bonus').value,
    dmg: tr.querySelector('.atk-dmg').value,
    managedWeapon: tr.dataset.managedWeapon || null,
    managedCantripAttack: tr.dataset.managedCantripAttack || null
  }));
  const spells = [...spellsBody.querySelectorAll('tr')].map(tr=>{
    const nameSel = tr.querySelector('.spell-name-select');
    const customInput = tr.querySelector('.spell-name-custom');
    const name = (nameSel.value === CUSTOM_SPELL) ? customInput.value : nameSel.value;
    return {
      level: tr.querySelector('.spell-level').value,
      name,
      prep: tr.querySelector('.spell-prep').checked,
      notes: tr.querySelector('.spell-notes').value,
      subclassBonus: tr.dataset.subclassBonus || null,
      managedCantrip: tr.dataset.managedCantrip || null,
      managedGuildSpell: tr.dataset.managedGuildSpell || null
    };
  });
  function gatherActionRows(body){
    return [...body.querySelectorAll('tr')].map(tr=>({
      name: tr.querySelector('.act-name').value,
      limited: tr.querySelector('.act-limited').checked,
      current: tr.querySelector('.act-uses-current').value,
      max: tr.querySelector('.act-uses-max').value,
      recharge: tr.querySelector('.act-recharge').value,
      universalAction: tr.dataset.universalAction || null,
      managedSubclassAction: tr.dataset.managedSubclassAction || null,
      managedSubclassBonusAction: tr.dataset.managedSubclassBonusAction || null
    }));
  }
  const actions = gatherActionRows(actionsBody);
  const bonusActions = gatherActionRows(bonusActionsBody);
  return {fields, attacks, spells, actions, bonusActions, _type:'dnd5e-character', _version:1};
}

function escapeAttr(s){
  return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\\]]/g, '\\$&');
}

function loadData(data){
  if(!data || !data.fields) return;

  // Rebuild the interactive choices panel first so choice_*/classBonus_* fields exist to receive values
  const raceKey = data.fields.buildRace || '';
  const classKey = data.fields.buildClass || '';
  const bgKey = data.fields.buildBackground || '';
  const level = Math.max(1, Math.min(20, parseInt(data.fields.buildLevel,10) || 1));
  if(raceKey || classKey || bgKey){
    const raceSel = document.getElementById('buildRace'); if(raceSel) raceSel.value = raceKey;
    const classSel = document.getElementById('buildClass'); if(classSel) classSel.value = classKey;
    const bgSel = document.getElementById('buildBackground'); if(bgSel) bgSel.value = bgKey;
    const lvlInput = document.getElementById('buildLevel'); if(lvlInput) lvlInput.value = level;
    ACTIVE.race = RACES[raceKey] || null;
    ACTIVE.cls = CLASSES[classKey] || null;
    ACTIVE.bg = BACKGROUNDS[bgKey] || null;
    ACTIVE.level = level;
    renderChoicesPanel(ACTIVE.race, ACTIVE.cls, ACTIVE.bg, level);
  }

  Object.entries(data.fields).forEach(([name,val])=>{
    const els = document.querySelectorAll(`#sheet [name="${escapeAttr(name)}"]`);
    if(!els.length) return;
    if(els[0].type==='radio'){
      els.forEach(r=>{ r.checked = (r.value===val); });
    } else if(els[0].type==='checkbox'){
      els[0].checked = !!val;
    } else {
      els[0].value = val;
    }
  });
  attacksBody.innerHTML='';
  (data.attacks && data.attacks.length ? data.attacks : [{},{},{}]).forEach(v=>attacksBody.appendChild(makeAttackRow(v)));
  spellsBody.innerHTML='';
  (data.spells||[]).forEach(v=>spellsBody.appendChild(makeSpellRow(v)));

  actionsBody.innerHTML='';
  if(data.actions && data.actions.length){
    data.actions.forEach(v=>actionsBody.appendChild(makeActionRow(v)));
  } else {
    UNIVERSAL_ACTIONS.forEach(name=>{
      const tr = makeActionRow({name, limited:false});
      tr.dataset.universalAction = 'true';
      actionsBody.appendChild(tr);
    });
  }
  bonusActionsBody.innerHTML='';
  (data.bonusActions||[]).forEach(v=>bonusActionsBody.appendChild(makeActionRow(v)));

  if(ACTIVE.race || ACTIVE.cls || ACTIVE.bg){
    managedSkillKeys = new Set();
    managedSubclassSpellNames = new Set((data.spells||[]).filter(s=>s.subclassBonus).map(s=>s.subclassBonus));
    managedCantripSpellNames = new Set((data.spells||[]).filter(s=>s.managedCantrip).map(s=>s.managedCantrip));
    managedGuildSpellNames = new Set((data.spells||[]).filter(s=>s.managedGuildSpell).map(s=>s.managedGuildSpell));
    managedCantripAttackNames = new Set((data.attacks||[]).filter(a=>a.managedCantripAttack).map(a=>a.managedCantripAttack));
    managedSubclassActionNames = new Set((data.actions||[]).filter(a=>a.managedSubclassAction).map(a=>a.managedSubclassAction));
    managedSubclassBonusActionNames = new Set((data.bonusActions||[]).filter(a=>a.managedSubclassBonusAction).map(a=>a.managedSubclassBonusAction));
    updateAsiVisibility();
    updateEquipModeVisibility();
    markRequiredFields();
    syncManagedSkills();
    recomputeClassBonuses();
    refreshAllSpellEffects();
  }
  recalc();
}

document.getElementById('btnSave').onclick = ()=>{
  const data = gatherData();
  const name = (data.fields.charName||'character').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'character';
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

document.getElementById('btnLoad').onclick = ()=> document.getElementById('fileInput').click();
document.getElementById('fileInput').onchange = (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      loadData(data);
    }catch(err){
      alert('Could not read that file — is it a character .json saved from this tool?');
    }
  };
  reader.readAsText(file);
  e.target.value='';
};

document.getElementById('btnNew').onclick = ()=>{
  if(confirm('Clear the sheet and start a new character? Unsaved changes will be lost.')){
    document.querySelectorAll('#sheet input[type=text], #sheet input:not([type]), #sheet input[name^="score_"]').forEach(el=>{
      if(el.name && el.name.startsWith('score_')) el.value='10'; else el.value='';
    });
    document.querySelectorAll('#sheet input[type=checkbox]').forEach(el=>el.checked=false);
    document.querySelectorAll('#sheet textarea').forEach(el=>el.value='');
    document.querySelectorAll('#sheet select').forEach(el=>el.selectedIndex=0);
    attacksBody.innerHTML=''; for(let i=0;i<3;i++) attacksBody.appendChild(makeAttackRow());
    spellsBody.innerHTML='';
    recalc();
  }
};

// ---------- print / PDF ----------
function prepareForPrint(){
  document.body.classList.add('printing');
  document.querySelectorAll('#sheet textarea').forEach(ta=>{
    const div = document.createElement('div');
    div.className='print-textarea';
    div.textContent = ta.value;
    ta.insertAdjacentElement('afterend', div);
  });
}
function cleanupAfterPrint(){
  document.body.classList.remove('printing');
  document.querySelectorAll('.print-textarea').forEach(d=>d.remove());
}
document.getElementById('btnPdf').onclick = ()=>{
  prepareForPrint();
  window.print();
};
window.addEventListener('afterprint', cleanupAfterPrint);

document.querySelector('[name="ac"]').addEventListener('input', ()=>{
  document.querySelector('[name="acManual"]').value = '1';
});
document.getElementById('btnAcReset').addEventListener('click', ()=>{
  document.querySelector('[name="acManual"]').value = '0';
  recalc();
});
document.getElementById('btnReopenChoices').addEventListener('click', (e)=>{
  e.preventDefault();
  const card = document.getElementById('choicesCard');
  if(card && (ACTIVE.cls || ACTIVE.race || ACTIVE.bg)){
    card.style.display = '';
    card.scrollIntoView({behavior:'smooth', block:'start'});
  }
});
document.getElementById('btnShowBuilder').addEventListener('click', ()=>{
  const builderCard = document.querySelector('.builder-card');
  const builderBar = document.getElementById('builderCollapsedBar');
  if(builderCard) builderCard.style.display = '';
  if(builderBar) builderBar.style.display = 'none';
  if(builderCard) builderCard.scrollIntoView({behavior:'smooth', block:'start'});
});

recalc();
