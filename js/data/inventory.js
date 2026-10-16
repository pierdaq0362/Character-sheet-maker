// ============================================================================
// Inventory — 🎒 drawer on the Equipment card. Item library (weapons, armor,
// gear, magic items), per-item stat popups with an editable description,
// carry capacity (Str × 15 lb, doubled for Goliath's Powerful Build), equip
// armor/shield → AC, and "Add to Attacks" for weapons.
// Persists via hidden #inventoryField (generic save/load + auto-save).
// Self-contained: doesn't touch js/app.js. The old Equipment notes box stays.
// ============================================================================
(function(){

  // ---- library (compact: name|damage|type|properties|weight|cost|ranged) ----
  const WEAPON_LIB = {
    'Simple Melee': [
      'Club|1d4|bludgeoning|Light|2|1 sp','Dagger|1d4|piercing|Finesse, Light, Thrown (20/60)|1|2 gp',
      'Greatclub|1d8|bludgeoning|Two-handed|10|2 sp','Handaxe|1d6|slashing|Light, Thrown (20/60)|2|5 gp',
      'Javelin|1d6|piercing|Thrown (30/120)|2|5 sp','Light Hammer|1d4|bludgeoning|Light, Thrown (20/60)|2|2 gp',
      'Mace|1d6|bludgeoning||4|5 gp','Quarterstaff|1d6|bludgeoning|Versatile (1d8)|4|2 sp',
      'Sickle|1d4|slashing|Light|2|1 gp','Spear|1d6|piercing|Thrown (20/60), Versatile (1d8)|3|1 gp'],
    'Simple Ranged': [
      'Light Crossbow|1d8|piercing|Ammunition (80/320), Loading, Two-handed|5|25 gp|r','Dart|1d4|piercing|Finesse, Thrown (20/60)|0.25|5 cp|r',
      'Shortbow|1d6|piercing|Ammunition (80/320), Two-handed|2|25 gp|r','Sling|1d4|bludgeoning|Ammunition (30/120)|0|1 sp|r'],
    'Martial Melee': [
      'Battleaxe|1d8|slashing|Versatile (1d10)|4|10 gp','Flail|1d8|bludgeoning||2|10 gp',
      'Glaive|1d10|slashing|Heavy, Reach, Two-handed|6|20 gp','Greataxe|1d12|slashing|Heavy, Two-handed|7|30 gp',
      'Greatsword|2d6|slashing|Heavy, Two-handed|6|50 gp','Halberd|1d10|slashing|Heavy, Reach, Two-handed|6|20 gp',
      'Lance|1d12|piercing|Reach, Special|6|10 gp','Longsword|1d8|slashing|Versatile (1d10)|3|15 gp',
      'Maul|2d6|bludgeoning|Heavy, Two-handed|10|10 gp','Morningstar|1d8|piercing||4|15 gp',
      'Pike|1d10|piercing|Heavy, Reach, Two-handed|18|5 gp','Rapier|1d8|piercing|Finesse|2|25 gp',
      'Scimitar|1d6|slashing|Finesse, Light|3|25 gp','Shortsword|1d6|piercing|Finesse, Light|2|10 gp',
      'Trident|1d6|piercing|Thrown (20/60), Versatile (1d8)|4|5 gp','War Pick|1d8|piercing||2|5 gp',
      'Warhammer|1d8|bludgeoning|Versatile (1d10)|2|15 gp','Whip|1d4|slashing|Finesse, Reach|3|2 gp'],
    'Martial Ranged': [
      'Blowgun|1|piercing|Ammunition (25/100), Loading|1|10 gp|r','Hand Crossbow|1d6|piercing|Ammunition (30/120), Light, Loading|3|75 gp|r',
      'Heavy Crossbow|1d10|piercing|Ammunition (100/400), Heavy, Loading, Two-handed|18|50 gp|r',
      'Longbow|1d8|piercing|Ammunition (150/600), Heavy, Two-handed|2|50 gp|r']
  };
  // name|type|baseAC|dexCap(-1 none, 99 full)|strReq|stealthDis|weight|cost
  const ARMOR_LIB = [
    'Padded|Light|11|99|0|1|8|5 gp','Leather|Light|11|99|0|0|10|10 gp','Studded Leather|Light|12|99|0|0|13|45 gp',
    'Hide|Medium|12|2|0|0|12|10 gp','Chain Shirt|Medium|13|2|0|0|20|50 gp','Scale Mail|Medium|14|2|0|1|45|50 gp',
    'Breastplate|Medium|14|2|0|0|20|400 gp','Half Plate|Medium|15|2|0|1|40|750 gp',
    'Ring Mail|Heavy|14|-1|0|1|40|30 gp','Chain Mail|Heavy|16|-1|13|1|55|75 gp','Splint|Heavy|17|-1|15|1|60|200 gp','Plate|Heavy|18|-1|15|1|65|1,500 gp',
    'Shield|Shield|2|0|0|0|6|10 gp'
  ];
  // name|weight|cost|category(g=gear,c=consumable)
  const GEAR_LIB = [
    'Backpack|5|2 gp|g','Bedroll|7|1 gp|g','Blanket|3|5 sp|g','Crowbar|5|2 gp|g','Grappling Hook|4|2 gp|g',"Healer's Kit|3|5 gp|g",
    'Hempen Rope (50 ft)|10|1 gp|g','Silk Rope (50 ft)|5|10 gp|g','Lantern, Hooded|2|5 gp|g','Mess Kit|1|2 sp|g','Rations (1 day)|2|5 sp|c',
    'Tinderbox|1|5 sp|g','Torch|1|1 cp|c','Waterskin|5|2 sp|g',"Thieves' Tools|1|25 gp|g","Tinker's Tools|10|50 gp|g","Smith's Tools|8|20 gp|g",
    'Component Pouch|2|25 gp|g','Arcane Focus (crystal)|1|10 gp|g','Holy Symbol|1|5 gp|g','Spellbook|3|50 gp|g',"Climber's Kit|12|25 gp|g",
    'Pouch|1|5 sp|g','Sack|0.5|1 cp|g','Tent (two-person)|20|2 gp|g','Shovel|5|2 gp|g',"Miner's Pick|10|2 gp|g",'Hammer|3|1 gp|g','Piton|0.25|5 cp|g',
    'Manacles|6|2 gp|g','Ball Bearings (bag)|2|1 gp|g','Fishing Tackle|4|1 gp|g','Signal Whistle|0|5 cp|g','Oil (flask)|1|1 sp|c',
    "Alchemist's Fire (flask)|1|50 gp|c",'Acid (vial)|1|25 gp|c','Holy Water (flask)|1|25 gp|c','Arrows (20)|1|1 gp|c','Bolts (20)|1.5|1 gp|c','Sling Bullets (20)|1.5|4 cp|c'
  ];
  // name|rarity|attune|weight|cat(m/c)
  const MAGIC_META = {
    'Potion of Healing':['Common',0,0.5,'consumable'],'Potion of Greater Healing':['Uncommon',0,0.5,'consumable'],
    'Bag of Holding':['Uncommon',0,15,'magic'],'Cloak of Protection':['Uncommon',1,1,'magic'],'Wand of Magic Missiles':['Uncommon',0,1,'magic'],
    'Ring of Protection':['Rare',1,0,'magic'],'Boots of Elvenkind':['Uncommon',0,1,'magic'],'Cloak of Elvenkind':['Uncommon',1,1,'magic'],
    'Bag of Tricks':['Uncommon',0,0.5,'magic'],'Immovable Rod':['Uncommon',0,2,'magic']
  };

  const CATS = { weapon:'⚔️ Weapons', armor:'🛡️ Armor & Shields', magic:'✨ Magic Items', consumable:'🧪 Consumables & Ammo', gear:'🎒 Gear', other:'💰 Other' };
  const RARITIES = ['Common','Uncommon','Rare','Very Rare','Legendary','Artifact'];

  let state = { items: [], maxCarry: '' };
  let acManaged = false;

  // ---------------- helpers ----------------
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const num = (v, d=0) => { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const fmtS = n => (n>=0?'+':'−') + Math.abs(n);
  const fmtW = n => (Math.round(n*100)/100).toString();
  const $ = id => document.getElementById(id);
  const uid = () => `inv_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

  function field(){ return $('inventoryField'); }
  function persist(){ const f = field(); if(f) f.value = JSON.stringify(state); }
  function loadState(){
    const f = field();
    try { const s = JSON.parse((f && f.value) || ''); if(s && Array.isArray(s.items)) state = { items:s.items, maxCarry:s.maxCarry||'' }; else state = {items:[], maxCarry:''}; }
    catch(e){ state = {items:[], maxCarry:''}; }
  }
  function abilityMod(k){ try { return currentAbilityMod(k); } catch(e){ return 0; } }
  function profB(){ try { return profBonusFor(document.querySelector('[name="classLevel"]').value); } catch(e){ return 2; } }

  // ---------------- capacity ----------------
  function strTotal(){
    const g = n => { const el = document.querySelector(`[name="${n}"]`); return el ? num(el.value) : 0; };
    return (g('score_str') || 10) + g('racialBonus_str') + g('classBonus_str');
  }
  function capacity(){
    if(state.maxCarry !== '' && num(state.maxCarry) > 0) return { cap:num(state.maxCarry), note:'custom limit' };
    const race = (document.querySelector('[name="race"]') || {value:''}).value;
    const big = /goliath/i.test(race);
    return { cap: strTotal() * 15 * (big ? 2 : 1), note: `Str ${strTotal()} × 15 lb${big ? ' × 2 (Powerful Build)' : ''}` };
  }
  function coinWeight(){
    return ['cp','sp','ep','gp','pp'].reduce((s,k)=>{ const el = document.querySelector(`[name="${k}"]`); return s + (el ? num(String(el.value).replace(/,/g,'')) : 0); }, 0) / 50;
  }
  function itemsWeight(){ return state.items.reduce((s,i)=> s + num(i.weight) * Math.max(0, num(i.qty,1)), 0); }

  // ---------------- AC from equipped armor ----------------
  function updateAC(){
    const armor = state.items.find(i=>i.cat==='armor' && i.equipped && (i.armorType||'Light') !== 'Shield');
    const shield = state.items.find(i=>i.cat==='armor' && i.equipped && i.armorType === 'Shield');
    const acEl = document.querySelector('[name="ac"]');
    const manual = document.querySelector('[name="acManual"]');
    if(!acEl || !manual) return;
    if(!armor && !shield){
      if(acManaged){ manual.value = '0'; acManaged = false; const sh = $('sheet'); if(sh) sh.dispatchEvent(new Event('input')); }
      return;
    }
    const dex = abilityMod('dex');
    let ac;
    if(armor){
      const cap = armor.dexCap === undefined ? 99 : num(armor.dexCap, 99);
      const dexPart = cap < 0 ? 0 : Math.min(dex, cap);
      ac = num(armor.ac, 10) + dexPart + num(armor.acBonus);
    } else ac = 10 + dex;
    if(shield) ac += num(shield.ac, 2) + num(shield.acBonus);
    acEl.value = ac;
    manual.value = '1';
    acManaged = true;
  }

  // ---------------- text helpers ----------------
  function statLine(it){
    const s = [];
    if(it.cat === 'weapon'){
      const b = num(it.bonus);
      s.push(`${esc(it.dmg||'—')}${b?' '+fmtS(b):''} ${esc(it.dmgType||'')}`.trim());
      if(it.props) s.push(esc(it.props));
    } else if(it.cat === 'armor'){
      if(it.armorType === 'Shield') s.push(`+${num(it.ac,2)+num(it.acBonus)} AC`);
      else {
        const cap = it.dexCap === undefined ? 99 : num(it.dexCap,99);
        s.push(`${esc(it.armorType||'Light')} · AC ${num(it.ac,10)+num(it.acBonus)}${cap<0?'':cap<99?` + Dex (max ${cap})`:' + Dex'}`);
        if(num(it.strReq)) s.push(`Str ${num(it.strReq)} req.`);
        if(it.stealthDis) s.push('Stealth disadv.');
      }
    } else if(it.cat === 'magic' || it.cat === 'consumable'){
      if(it.rarity) s.push(esc(it.rarity));
      if(it.attune) s.push(it.attuned ? 'Attuned' : 'Requires attunement');
      if(num(it.chargesMax)) s.push(`${num(it.charges)}/${num(it.chargesMax)} charges`);
    }
    return s.join(' · ');
  }

  // ---------------- main UI ----------------
  const css = document.createElement('style');
  css.textContent = `
    .inv-drawer{width:min(500px,100vw);}
    .inv-cap{background:#fffaf0; border:1px solid var(--line); border-radius:8px; padding:8px 10px; margin-bottom:10px;}
    .inv-cap .bar{height:9px; background:#e6dcc3; border-radius:5px; overflow:hidden; margin:5px 0;}
    .inv-cap .bar>div{height:100%; background:#6b8f3c; transition:width .2s;}
    .inv-cap.warn .bar>div{background:#d09a22;} .inv-cap.over .bar>div{background:var(--burgundy);}
    .inv-cap .small{font-size:11px; color:var(--ink-soft);}
    .inv-tabs{display:flex; flex-wrap:wrap; gap:5px; margin-bottom:6px;}
    .inv-tabs .btn.active{outline:2px solid var(--gold);}
    .inv-lib{border:1px solid var(--line); border-radius:8px; padding:8px; margin-bottom:12px; background:#fffaf0;}
    .inv-lib input[type=text]{width:100%; margin-bottom:6px;}
    .inv-lib-list{max-height:210px; overflow:auto;}
    .inv-lib-item{display:flex; gap:8px; align-items:baseline; padding:4px 6px; border-radius:5px; cursor:pointer; font-size:12.5px;}
    .inv-lib-item:hover{background:#f3ead6;}
    .inv-lib-item .n{flex:1 1 auto; font-weight:700;} .inv-lib-item .d{font-size:10.5px; color:var(--ink-soft); font-family:'JetBrains Mono',monospace;}
    .inv-group{font-family:'Cinzel',serif; font-size:12px; font-weight:700; margin:10px 0 4px; color:var(--burgundy);}
    .inv-row{display:flex; align-items:center; gap:7px; background:#fffaf0; border:1px solid var(--line); border-radius:7px; padding:6px 8px; margin-bottom:5px;}
    .inv-row.eq{border-color:var(--gold); background:#fff4d6;}
    .inv-row .nm{flex:1 1 auto; cursor:pointer; min-width:0;}
    .inv-row .nm b{font-size:13px;} .inv-row .nm .sub{font-size:10.5px; color:var(--ink-soft); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
    .inv-row .qty{display:flex; align-items:center; gap:3px; font-family:'JetBrains Mono',monospace; font-size:12px;}
    .inv-row .qty button{border:1px solid var(--line); background:#fff; border-radius:4px; width:20px; height:20px; cursor:pointer; line-height:1;}
    .inv-row .w{font-size:10.5px; color:var(--ink-soft); min-width:44px; text-align:right; font-family:'JetBrains Mono',monospace;}
    .inv-row .eqbox{font-size:10px; display:flex; flex-direction:column; align-items:center; color:var(--ink-soft);}
    .inv-custom{display:grid; grid-template-columns:1fr 1fr; gap:6px;}
    .inv-custom input, .inv-custom select{width:100%;}
    .inv-detail{width:min(520px,94vw); max-height:90vh; overflow:auto;}
    .inv-statcard{background:#fffaf0; border:1px solid var(--gold); border-radius:8px; padding:8px 10px; margin:6px 0 10px; font-size:13px;}
    .inv-grid{display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:8px;}
    .inv-grid label{font-size:10.5px; display:flex; flex-direction:column; gap:2px; color:var(--ink-soft);}
    .inv-grid input, .inv-grid select{width:100%;}
    .inv-grid .chk{flex-direction:row; align-items:center; gap:6px; font-size:12px; color:var(--ink);}
    #invSummary{font-size:12px; color:var(--ink-soft); margin:2px 0 8px;}
    #invSummary.over{color:var(--burgundy); font-weight:700;}
  `;
  document.head.appendChild(css);

  let libTab = 'weapon';

  function buildPanel(){
    const o = document.createElement('div');
    o.id = 'inventoryOverlay'; o.className = 'spellbook-overlay'; o.style.display = 'none';
    o.innerHTML = `
      <aside class="spellbook-drawer inv-drawer">
        <div class="spellbook-header"><h3>🎒 Inventory</h3>
          <button type="button" id="btnCloseInventory" class="spell-modal-close" aria-label="Close">✕</button></div>
        <div class="spellbook-list">
          <div class="inv-cap" id="invCap"></div>
          <div class="inv-tabs" id="invTabs">
            <button type="button" class="btn small" data-lib="weapon">⚔️ Weapons</button>
            <button type="button" class="btn small" data-lib="armor">🛡️ Armor</button>
            <button type="button" class="btn small" data-lib="gear">🎒 Gear</button>
            <button type="button" class="btn small" data-lib="magic">✨ Magic</button>
            <button type="button" class="btn small secondary" data-lib="custom">＋ Custom</button>
            <button type="button" class="btn small secondary" data-lib="">Hide</button>
          </div>
          <div class="inv-lib" id="invLib" style="display:none;"></div>
          <div id="invList"></div>
        </div>
      </aside>`;
    document.body.appendChild(o);
    o.addEventListener('click', e=>{ if(e.target === o) closePanel(); });
    $('btnCloseInventory').addEventListener('click', closePanel);
    $('invTabs').addEventListener('click', e=>{
      const b = e.target.closest('[data-lib]'); if(!b) return;
      libTab = b.dataset.lib; renderLib();
    });
    $('invList').addEventListener('click', onListClick);
  }

  function renderCap(){
    const { cap, note } = capacity();
    const iw = itemsWeight(), cw = coinWeight(), tot = iw + cw;
    const pct = Math.min(100, cap ? tot / cap * 100 : 0);
    const el = $('invCap');
    if(el){
      el.className = 'inv-cap' + (tot > cap ? ' over' : pct > 66 ? ' warn' : '');
      const enc = strTotal()*5, heavy = strTotal()*10;
      el.innerHTML = `<div><b>${fmtW(tot)}</b> / ${fmtW(cap)} lb carried
          <span class="small">(items ${fmtW(iw)}${cw ? ` + coins ${fmtW(cw)}` : ''})</span></div>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <div class="small">${esc(note)}.${tot > cap ? ' <b style="color:var(--burgundy)">Over capacity — you can\'t carry this much.</b>' : ''}
          Variant rule: encumbered above ${enc} lb, heavily above ${heavy} lb.</div>
        <div class="small" style="margin-top:4px;">Custom limit (lb): <input type="number" id="invMaxCarry" class="plain-input" style="width:80px;" value="${esc(state.maxCarry)}" placeholder="auto"></div>`;
      const mc = $('invMaxCarry');
      if(mc) mc.addEventListener('input', ()=>{ state.maxCarry = mc.value; persist(); renderSummary(); const c = capacity(); /* keep input focus */ updateCapBar(); });
    }
    renderSummary();
  }
  function updateCapBar(){
    const { cap } = capacity(); const tot = itemsWeight() + coinWeight();
    const el = $('invCap'); if(!el) return;
    el.className = 'inv-cap' + (tot > cap ? ' over' : (cap && tot/cap > 0.66) ? ' warn' : '');
    const bar = el.querySelector('.bar>div'); if(bar) bar.style.width = Math.min(100, cap ? tot/cap*100 : 0) + '%';
    const first = el.firstElementChild; if(first) first.innerHTML = `<b>${fmtW(tot)}</b> / ${fmtW(cap)} lb carried`;
  }
  function renderSummary(){
    const el = $('invSummary'); if(!el) return;
    const { cap } = capacity(); const tot = itemsWeight() + coinWeight();
    const n = state.items.reduce((s,i)=>s+Math.max(0,num(i.qty,1)),0);
    el.className = tot > cap ? 'over' : '';
    el.textContent = `🎒 ${n} item${n===1?'':'s'} · ${fmtW(tot)} / ${fmtW(cap)} lb${tot>cap?' — OVER CAPACITY':''}`;
  }

  function renderList(){
    const el = $('invList'); if(!el) return;
    if(!state.items.length){ el.innerHTML = '<div style="font-size:12.5px; color:var(--ink-soft); padding:8px 2px;">Nothing here yet — pick a category above to add items, or use ＋ Custom.</div>'; return; }
    let h = '';
    Object.keys(CATS).forEach(cat=>{
      const items = state.items.filter(i=>(i.cat||'other') === cat);
      if(!items.length) return;
      h += `<div class="inv-group">${CATS[cat]}</div>`;
      items.forEach(i=>{
        const canEq = (cat==='weapon' || cat==='armor' || cat==='magic');
        h += `<div class="inv-row ${i.equipped?'eq':''}" data-id="${i.id}">
          <div class="nm" data-act="open"><b>${esc(i.name)}</b>${i.attuned?' ✦':''}<div class="sub">${statLine(i) || '&nbsp;'}</div></div>
          <div class="qty"><button data-act="dec">−</button><span>${num(i.qty,1)}</span><button data-act="inc">+</button></div>
          <div class="w">${fmtW(num(i.weight)*Math.max(0,num(i.qty,1)))} lb</div>
          ${canEq ? `<label class="eqbox"><input type="checkbox" data-act="eq" ${i.equipped?'checked':''}>${cat==='magic'?'worn':'equip'}</label>` : ''}
        </div>`;
      });
    });
    el.innerHTML = h;
  }

  function onListClick(e){
    const row = e.target.closest('.inv-row'); if(!row) return;
    const it = state.items.find(i=>i.id === row.dataset.id); if(!it) return;
    const act = (e.target.closest('[data-act]') || {dataset:{}}).dataset.act;
    if(act === 'open'){ openDetail(it.id); return; }
    if(act === 'inc'){ it.qty = num(it.qty,1) + 1; }
    else if(act === 'dec'){
      it.qty = num(it.qty,1) - 1;
      if(it.qty <= 0){ if(!confirm(`Remove ${it.name}?`)){ it.qty = 1; return; } state.items = state.items.filter(x=>x!==it); }
    }
    else if(act === 'eq'){ setEquipped(it, e.target.checked); }
    else return;
    refresh();
  }

  function setEquipped(it, on){
    it.equipped = on;
    if(on && it.cat === 'armor'){
      const isShield = it.armorType === 'Shield';
      state.items.forEach(o=>{ if(o!==it && o.cat==='armor' && ((o.armorType==='Shield') === isShield)) o.equipped = false; });
      const need = num(it.strReq);
      if(need && strTotal() < need && typeof showToast === 'function') showToast(`${it.name} needs Str ${need} — your speed drops by 10 ft.`, 'warn');
    }
    if(!on && it.cat === 'magic') { /* worn flag only */ }
  }

  function refresh(){ persist(); updateAC(); renderCap(); renderList(); }

  // ---------------- library ----------------
  function libEntries(tab){
    if(tab === 'weapon'){
      const out = [];
      Object.entries(WEAPON_LIB).forEach(([grp, arr])=> arr.forEach(s=>{
        const [name,dmg,type,props,w,cost,r] = s.split('|');
        out.push({ label:name, detail:`${dmg} ${type}`, group:grp, make:()=>({ name, cat:'weapon', weight:num(w), value:cost, dmg, dmgType:type, props, ranged:r==='r', bonus:0, prof:true,
          desc:`${grp} weapon.` }) });
      }));
      return out;
    }
    if(tab === 'armor') return ARMOR_LIB.map(s=>{
      const [name,type,ac,dc,str,st,w,cost] = s.split('|');
      return { label:name, detail: type==='Shield' ? '+2 AC' : `${type} · AC ${ac}`, group: type==='Shield'?'Shield':`${type} armor`,
        make:()=>({ name, cat:'armor', armorType:type, ac:num(ac), dexCap:num(dc), strReq:num(str), stealthDis:st==='1', weight:num(w), value:cost, acBonus:0 }) };
    });
    if(tab === 'gear') return GEAR_LIB.map(s=>{
      const [name,w,cost,c] = s.split('|');
      return { label:name, detail:`${w} lb · ${cost}`, group: c==='c' ? 'Consumables & ammo' : 'Adventuring gear',
        make:()=>({ name, cat: c==='c' ? 'consumable' : 'gear', weight:num(w), value:cost, stackable:true }) };
    });
    if(tab === 'magic'){
      const custom = (typeof window.getMergedCustomMagic === 'function') ? window.getMergedCustomMagic()
        : ((typeof CUSTOM_MAGIC_ITEMS !== 'undefined') ? CUSTOM_MAGIC_ITEMS : []);
      const campaign = custom.map(c=>({ label:c.name, detail:[c.rarity, c.attune?'attunement':''].filter(Boolean).join(' · '), group:'✨ Campaign items (from your DM)',
        make:()=>{ const p = JSON.parse(JSON.stringify(c)); delete p.id; if(p.chargesMax) p.charges = p.chargesMax; p.stackable = (p.cat === 'consumable'); return p; } }));
      const list = (typeof MAGIC_ITEMS !== 'undefined') ? MAGIC_ITEMS : [];
      return campaign.concat(list.map(m=>{
        const meta = MAGIC_META[m.name] || ['', 0, 0, 'magic'];
        return { label:m.name, detail:meta[0], group:'Magic items',
          make:()=>({ name:m.name, cat:meta[3], rarity:meta[0], attune:!!meta[1], weight:meta[2], desc:m.effect, stackable: meta[3]==='consumable' }) };
      }));
    }
    return [];
  }

  function addItem(proto){
    const stack = proto.stackable && state.items.find(i=>i.name===proto.name && !i.equipped);
    if(stack){ stack.qty = num(stack.qty,1) + 1; }
    else state.items.push(Object.assign({ id:uid(), qty:1, equipped:false, desc:'' }, proto));
    refresh();
    if(typeof showToast === 'function') showToast(`${proto.name} added to inventory.`);
  }

  function renderLib(){
    const box = $('invLib');
    document.querySelectorAll('#invTabs [data-lib]').forEach(b=> b.classList.toggle('active', b.dataset.lib === libTab && libTab));
    if(!libTab){ box.style.display = 'none'; return; }
    box.style.display = '';
    if(libTab === 'custom'){
      box.innerHTML = `<div class="inv-custom">
        <input type="text" id="cuName" class="plain-input" placeholder="Item name" style="grid-column:1 / -1;">
        <select id="cuCat" class="plain-input">${Object.entries(CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
        <input type="number" id="cuWeight" class="plain-input" placeholder="Weight (lb each)" step="0.25" min="0">
        <button type="button" class="btn small" id="cuAdd" style="grid-column:1 / -1;">+ Add item (edit its stats afterwards)</button></div>`;
      $('cuAdd').addEventListener('click', ()=>{
        const name = $('cuName').value.trim(); if(!name) return;
        const cat = $('cuCat').value;
        const p = { name, cat, weight:num($('cuWeight').value) };
        if(cat==='weapon') Object.assign(p, {dmg:'1d6', dmgType:'slashing', props:'', bonus:0, prof:true, ranged:false});
        if(cat==='armor') Object.assign(p, {armorType:'Light', ac:11, dexCap:99, strReq:0, stealthDis:false, acBonus:0});
        if(cat==='magic' || cat==='consumable') Object.assign(p, {rarity:'Uncommon', attune:false});
        addItem(p); $('cuName').value = '';
      });
      return;
    }
    box.innerHTML = `<input type="text" id="libSearch" class="plain-input" placeholder="Search…"><div class="inv-lib-list" id="libList"></div>`;
    const entries = libEntries(libTab);
    const draw = ()=>{
      const q = $('libSearch').value.trim().toLowerCase();
      let h = '', last = '';
      entries.forEach((en, i)=>{
        if(q && !en.label.toLowerCase().includes(q)) return;
        if(en.group !== last){ h += `<div class="inv-group" style="margin:6px 0 2px;">${esc(en.group)}</div>`; last = en.group; }
        h += `<div class="inv-lib-item" data-i="${i}"><span class="n">${esc(en.label)}</span><span class="d">${esc(en.detail)}</span></div>`;
      });
      $('libList').innerHTML = h || '<div style="font-size:12px; color:var(--ink-soft);">No matches — use ＋ Custom.</div>';
    };
    $('libSearch').addEventListener('input', draw);
    $('libList').addEventListener('click', e=>{
      const r = e.target.closest('.inv-lib-item'); if(!r) return;
      addItem(entries[parseInt(r.dataset.i,10)].make());
    });
    draw();
  }

  // ---------------- detail popup ----------------
  function closeDetail(){ const d = $('invDetailOverlay'); if(d) d.remove(); }

  function openDetail(id){
    const it = state.items.find(i=>i.id === id); if(!it) return;
    closeDetail();
    const o = document.createElement('div');
    o.id = 'invDetailOverlay'; o.className = 'spell-modal-overlay'; o.style.zIndex = 320;
    o.innerHTML = `<div class="spell-modal-box inv-detail">
      <button type="button" class="spell-modal-close" id="invDetailClose" aria-label="Close">✕</button>
      <div class="spell-modal-kicker" id="invDKicker"></div>
      <h3 id="invDTitle"></h3>
      <div class="inv-statcard" id="invDStat"></div>
      <div id="invDFields"></div>
      <label style="font-size:10.5px; color:var(--ink-soft);">Description / abilities (write your own notes here)</label>
      <textarea id="invDDesc" rows="5" style="width:100%; margin-bottom:10px;"></textarea>
      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
        <button type="button" class="btn small secondary" id="invDDelete">🗑 Remove</button>
        <button type="button" class="btn small" id="invDAttack" style="display:none;">→ Add to Attacks</button>
        <button type="button" class="btn small" id="invDDone">Done</button>
      </div></div>`;
    document.body.appendChild(o);
    o.addEventListener('click', e=>{ if(e.target === o) closeDetail(); });
    $('invDetailClose').addEventListener('click', closeDetail);
    $('invDDone').addEventListener('click', closeDetail);
    $('invDDelete').addEventListener('click', ()=>{
      if(!confirm(`Remove ${it.name} from your inventory?`)) return;
      state.items = state.items.filter(x=>x!==it); closeDetail(); refresh();
    });
    $('invDAttack').addEventListener('click', ()=> addToAttacks(it));
    $('invDDesc').value = it.desc || '';
    $('invDDesc').addEventListener('input', e=>{ it.desc = e.target.value; persist(); });
    drawDetail(it);
  }

  function drawDetail(it){
    $('invDKicker').textContent = CATS[it.cat||'other'].replace(/^\S+\s/,'');
    $('invDTitle').textContent = it.name;
    const stat = $('invDStat');
    const total = num(it.weight) * Math.max(0, num(it.qty,1));
    let extra = '';
    if(it.cat === 'weapon'){
      const finesse = /finesse/i.test(it.props||'');
      const mod = finesse ? Math.max(abilityMod('str'), abilityMod('dex')) : (it.ranged ? abilityMod('dex') : abilityMod('str'));
      const atk = mod + (it.prof ? profB() : 0) + num(it.bonus);
      extra = `<div>Attack <b>${fmtS(atk)}</b> · Damage <b>${esc(it.dmg||'—')} ${fmtS(mod + num(it.bonus))}</b> ${esc(it.dmgType||'')}</div>`;
    }
    stat.innerHTML = `<div><b>${statLine(it) || 'No stats'}</b></div>${extra}
      <div style="font-size:11.5px; color:var(--ink-soft);">${num(it.qty,1)} × ${fmtW(num(it.weight))} lb = ${fmtW(total)} lb${it.value ? ' · ' + esc(it.value) : ''}</div>`;
    $('invDAttack').style.display = it.cat === 'weapon' ? '' : 'none';

    const f = (label, key, type='text', extra='') => `<label>${label}<input class="plain-input" data-k="${key}" type="${type}" ${extra} value="${esc(it[key]==null?'':it[key])}"></label>`;
    const chk = (label, key) => `<label class="chk"><input type="checkbox" data-k="${key}" ${it[key]?'checked':''}> ${label}</label>`;
    let h = `<div class="inv-grid">
      ${f('Name','name')}
      <label>Category<select class="plain-input" data-k="cat">${Object.entries(CATS).map(([k,v])=>`<option value="${k}" ${k===(it.cat||'other')?'selected':''}>${v}</option>`).join('')}</select></label>
      ${f('Quantity','qty','number','min="0"')}${f('Weight each (lb)','weight','number','step="0.25" min="0"')}
      ${f('Value','value')}</div>`;
    if(it.cat === 'weapon'){
      h += `<div class="inv-grid">${f('Damage dice','dmg')}${f('Damage type','dmgType')}
        ${f('Properties','props')}${f('Magic bonus (+N)','bonus','number')}
        ${chk('Proficient','prof')}${chk('Ranged weapon','ranged')}</div>`;
    } else if(it.cat === 'armor'){
      h += `<div class="inv-grid">
        <label>Armor type<select class="plain-input" data-k="armorType">${['Light','Medium','Heavy','Shield'].map(t=>`<option ${t===(it.armorType||'Light')?'selected':''}>${t}</option>`).join('')}</select></label>
        ${f(it.armorType==='Shield'?'AC bonus':'Base AC','ac','number')}${f('Magic AC bonus','acBonus','number')}
        <label>Dex cap<select class="plain-input" data-k="dexCap"><option value="99" ${num(it.dexCap,99)===99?'selected':''}>Full Dex</option><option value="2" ${num(it.dexCap,99)===2?'selected':''}>Max +2</option><option value="-1" ${num(it.dexCap,99)<0?'selected':''}>No Dex</option></select></label>
        ${f('Str required','strReq','number')}${chk('Stealth disadvantage','stealthDis')}</div>`;
    } else if(it.cat === 'magic' || it.cat === 'consumable'){
      h += `<div class="inv-grid"><label>Rarity<select class="plain-input" data-k="rarity"><option value=""></option>${RARITIES.map(r=>`<option ${r===it.rarity?'selected':''}>${r}</option>`).join('')}</select></label>
        ${chk('Requires attunement','attune')}${it.attune ? chk('Currently attuned','attuned') : ''}
        ${f('Charges','charges','number','min="0"')}${f('Max charges','chargesMax','number','min="0"')}</div>`;
    }
    const box = $('invDFields');
    box.innerHTML = h;
    box.querySelectorAll('[data-k]').forEach(inp=>{
      inp.addEventListener('input', ()=> onDetailEdit(it, inp, false));
      inp.addEventListener('change', ()=> onDetailEdit(it, inp, true));
    });
  }

  function onDetailEdit(it, inp, committed){
    const k = inp.dataset.k;
    if(inp.type === 'checkbox') it[k] = inp.checked;
    else if(inp.type === 'number') it[k] = inp.value === '' ? '' : num(inp.value);
    else if(k === 'dexCap') it[k] = num(inp.value, 99);
    else it[k] = inp.value;
    if(k === 'attuned' && inp.checked){
      const n = state.items.filter(i=>i.attuned).length;
      if(n > 3){ it.attuned = false; inp.checked = false; if(typeof showToast==='function') showToast('You can only be attuned to 3 items at once.', 'warn'); }
    }
    $('invDTitle').textContent = it.name;
    persist(); updateAC(); renderCap(); renderList();
    // re-draw the stat card (and, for structural fields, the form) without stealing focus
    if(committed && (k === 'cat' || k === 'armorType' || k === 'attune')) drawDetail(it);
    else {
      const keep = document.activeElement;
      const tmp = $('invDFields'); void tmp;
      refreshStatCardOnly(it);
      if(keep && keep.focus) keep.focus();
    }
  }
  function refreshStatCardOnly(it){
    const desc = $('invDDesc'); const fields = $('invDFields');
    const fHtml = fields.innerHTML; void fHtml; void desc;
    // cheap: update only the stat card by temporarily rebuilding via drawDetail's first half
    const stat = $('invDStat'); if(!stat) return;
    const total = num(it.weight) * Math.max(0, num(it.qty,1));
    let extra = '';
    if(it.cat === 'weapon'){
      const finesse = /finesse/i.test(it.props||'');
      const mod = finesse ? Math.max(abilityMod('str'), abilityMod('dex')) : (it.ranged ? abilityMod('dex') : abilityMod('str'));
      const atk = mod + (it.prof ? profB() : 0) + num(it.bonus);
      extra = `<div>Attack <b>${fmtS(atk)}</b> · Damage <b>${esc(it.dmg||'—')} ${fmtS(mod + num(it.bonus))}</b> ${esc(it.dmgType||'')}</div>`;
    }
    stat.innerHTML = `<div><b>${statLine(it) || 'No stats'}</b></div>${extra}
      <div style="font-size:11.5px; color:var(--ink-soft);">${num(it.qty,1)} × ${fmtW(num(it.weight))} lb = ${fmtW(total)} lb${it.value ? ' · ' + esc(it.value) : ''}</div>`;
  }

  function addToAttacks(it){
    const finesse = /finesse/i.test(it.props||'');
    const mod = finesse ? Math.max(abilityMod('str'), abilityMod('dex')) : (it.ranged ? abilityMod('dex') : abilityMod('str'));
    const b = num(it.bonus);
    const atk = mod + (it.prof ? profB() : 0) + b;
    const dmg = `${it.dmg || '—'} ${fmtS(mod + b)} ${it.dmgType || ''}`.trim();
    try {
      const body = (typeof attacksBody !== 'undefined') ? attacksBody : document.querySelector('#attacksTable tbody');
      body.appendChild(makeAttackRow({ name: it.name + (b ? ` ${fmtS(b)}` : ''), bonus: fmtS(atk), dmg }));
      if(typeof showToast === 'function') showToast(`${it.name} added to Attacks.`);
    } catch(e){ if(typeof showToast === 'function') showToast('Could not add to Attacks.', 'warn'); }
  }

  // ---------------- open / close / init ----------------
  function openPanel(){ loadState(); renderLib(); refresh(); $('inventoryOverlay').style.display = 'flex'; }
  function closePanel(){ const o = $('inventoryOverlay'); if(o) o.style.display = 'none'; }

  function init(){
    buildPanel();
    loadState();
    const btn = $('btnOpenInventory');
    if(btn) btn.addEventListener('click', openPanel);
    // summary line above the currency row
    const cur = document.querySelector('.currency-row');
    if(cur && !$('invSummary')){ const s = document.createElement('div'); s.id = 'invSummary'; cur.parentNode.insertBefore(s, cur); }
    renderSummary(); updateAC();
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape'){ if($('invDetailOverlay')) closeDetail(); else closePanel(); } });

    // keep capacity / AC live as the sheet changes
    const sheet = $('sheet');
    if(sheet) sheet.addEventListener('input', ()=>{ renderSummary(); if(acManaged) updateAC(); const ov = $('inventoryOverlay'); if(ov && ov.style.display !== 'none') updateCapBar(); });

    const fileInput = $('fileInput');
    if(fileInput) fileInput.addEventListener('change', ()=> setTimeout(()=>{ loadState(); acManaged = state.items.some(i=>i.cat==='armor' && i.equipped); renderSummary(); }, 400));
    const newBtn = $('btnNew');
    if(newBtn) newBtn.addEventListener('click', ()=>{
      const n = document.querySelector('[name="charName"]');
      if(n && n.value === ''){ state = {items:[], maxCarry:''}; persist(); acManaged = false; renderSummary(); }
    });
    // coins count toward weight
    ['cp','sp','ep','gp','pp'].forEach(k=>{ const el = document.querySelector(`[name="${k}"]`); if(el) el.addEventListener('input', ()=>{ renderSummary(); updateCapBar(); }); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
