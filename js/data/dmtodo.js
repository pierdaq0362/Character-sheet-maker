// ============================================================================
// DM Pending / In-Progress tracker — a card inside DM Mode for things you still
// need to finish (items to create, NPCs, encounters, maps…). Each entry has a
// status (Pending / In progress / Done), a category and optional notes.
// "Item" entries get a ➜ Create button that opens the Item Creator with the
// name pre-filled. Saved in this browser (localStorage); not shared with players.
// Self-contained: doesn't touch js/app.js.
// ============================================================================
(function(){
  const KEY = 'dnd5e_dm_todo_v1';
  const STATUSES = ['Pending','In progress','Done'];
  const CATS = ['Item','NPC','Encounter','Map / location','Other'];
  let filter = 'Open'; // Open | Pending | In progress | Done | All

  const esc = s => String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $ = id => document.getElementById(id);
  function load(){ try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch(e){ return []; } }
  function save(list){ try { localStorage.setItem(KEY, JSON.stringify(list)); } catch(e){} }

  const css = document.createElement('style');
  css.textContent = `
    .td-add{display:grid; grid-template-columns:1fr auto; gap:6px; margin-bottom:6px;}
    .td-add input, .td-add select{width:100%;}
    .td-filters{display:flex; flex-wrap:wrap; gap:5px; margin:8px 0;}
    .td-filters .btn.active{outline:2px solid var(--gold);}
    .td-row{background:var(--surface); border:1px solid var(--line); border-radius:7px; padding:7px 9px; margin-bottom:6px;}
    .td-row.done{opacity:.6;} .td-row.done .td-name{text-decoration:line-through;}
    .td-row.prog{border-color:var(--gold); background:var(--highlight);}
    .td-head{display:flex; align-items:center; gap:7px;}
    .td-name{flex:1 1 auto; font-weight:700; font-size:13px;}
    .td-cat{font-size:10px; color:var(--ink-soft); font-family:'JetBrains Mono',monospace;}
    .td-row select{font-size:11.5px;}
    .td-row textarea{width:100%; margin-top:5px; font-size:12px;}
    .td-row button.x{border:none; background:none; cursor:pointer; color:var(--ink-soft);}
  `;
  document.head.appendChild(css);

  function render(){
    const card = $('tdCard'); if(!card) return;
    const list = load();
    const open = list.filter(t=>t.status !== 'Done').length;
    const shown = list.filter(t=> filter === 'All' ? true : filter === 'Open' ? t.status !== 'Done' : t.status === filter);
    const typing = document.activeElement && card.contains(document.activeElement) && document.activeElement.id === 'tdName' ? $('tdName').value : null;
    card.innerHTML = `<h2>📌 Pending &amp; In Progress <span class="sub" style="font-weight:400; font-size:10px;">${open} open</span>
        <button type="button" class="btn small secondary" id="tdClear" style="margin-left:auto; align-self:center;">Clear done</button></h2>
      <div class="td-add">
        <input type="text" id="tdName" class="plain-input" placeholder="What still needs doing? (e.g. Cursed amulet for the lich)">
        <button type="button" class="btn small" id="tdAddBtn">+ Add</button>
        <select id="tdCat" class="plain-input">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
        <select id="tdStatus" class="plain-input">${STATUSES.slice(0,2).map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
      <div class="td-filters">${['Open','Pending','In progress','Done','All'].map(f=>`<button type="button" class="btn small secondary ${f===filter?'active':''}" data-f="${f}">${f}</button>`).join('')}</div>
      <div id="tdList">${shown.length ? shown.map(t=>`
        <div class="td-row ${t.status==='Done'?'done':t.status==='In progress'?'prog':''}" data-id="${t.id}">
          <div class="td-head">
            <input type="checkbox" data-a="done" ${t.status==='Done'?'checked':''} title="Mark done">
            <span class="td-name">${esc(t.name)}</span><span class="td-cat">${esc(t.cat)}</span>
            <select data-a="status">${STATUSES.map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select>
            ${t.cat==='Item' && t.status!=='Done' ? '<button type="button" class="btn small secondary" data-a="create">➜ Create</button>' : ''}
            <button type="button" class="x" data-a="del" title="Delete">✕</button>
          </div>
          <textarea rows="2" data-a="notes" placeholder="Notes…">${esc(t.notes||'')}</textarea>
        </div>`).join('') : '<div style="font-size:12px; color:var(--ink-soft);">Nothing here.</div>'}</div>`;
    if(typing !== null) $('tdName').value = typing;
    $('tdAddBtn').addEventListener('click', add);
    $('tdName').addEventListener('keydown', e=>{ if(e.key === 'Enter') add(); });
    $('tdClear').addEventListener('click', ()=>{
      const l = load(); if(!l.some(t=>t.status==='Done')) return;
      if(confirm('Remove all finished entries?')){ save(l.filter(t=>t.status!=='Done')); render(); }
    });
    card.querySelectorAll('[data-f]').forEach(b=> b.addEventListener('click', ()=>{ filter = b.dataset.f; render(); }));
    card.querySelectorAll('.td-row').forEach(row=>{
      const id = row.dataset.id;
      row.addEventListener('click', e=>{
        const a = e.target.dataset && e.target.dataset.a; if(!a) return;
        const l = load(); const t = l.find(x=>x.id===id); if(!t) return;
        if(a === 'del'){ save(l.filter(x=>x.id!==id)); render(); }
        else if(a === 'done'){ t.status = e.target.checked ? 'Done' : 'Pending'; save(l); render(); }
        else if(a === 'create'){
          const nb = $('icNew');
          if(nb){ nb.click(); const nm = $('icName'); if(nm){ nm.value = t.name; if(t.notes && $('icDesc')) $('icDesc').value = t.notes; } }
          else if(typeof showToast === 'function') showToast('Item Creator not available.', 'warn');
        }
      });
      row.addEventListener('change', e=>{
        if(e.target.dataset.a !== 'status') return;
        const l = load(); const t = l.find(x=>x.id===id); if(!t) return;
        t.status = e.target.value; save(l); render();
      });
      const ta = row.querySelector('textarea');
      ta.addEventListener('input', ()=>{ const l = load(); const t = l.find(x=>x.id===id); if(t){ t.notes = ta.value; save(l); } });
    });
  }

  function add(){
    const name = $('tdName').value.trim(); if(!name) return;
    const l = load();
    l.unshift({ id:`td_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name, cat:$('tdCat').value, status:$('tdStatus').value, notes:'' });
    save(l);
    if(filter === 'Done') filter = 'Open';
    render();
    $('tdName').focus();
  }

  function init(){
    const grid = document.querySelector('.dm-mode-grid'); if(!grid) return;
    const card = document.createElement('div');
    card.className = 'card'; card.id = 'tdCard';
    grid.appendChild(card);
    render();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
