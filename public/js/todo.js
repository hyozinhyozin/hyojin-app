import { fetchJSON } from '/js/api.js';

export async function renderTodo(view) {
  const date = new Date().toISOString().slice(0,10);
  async function load() {
    const items = await fetchJSON(`/api/todos?date=${date}`).catch(()=>[]);
    const remain = items.filter(t=>!t.done).length, done = items.filter(t=>t.done).length;
    view.innerHTML = `
      <h2 class="display" style="margin:12px 0">TO-DO <small style="font-size:14px">남은 일 ${remain} · 완료 ${done}</small></h2>
      <div class="panel">
        <div style="display:flex;gap:6px">
          <input id="c" placeholder="+ 새 할 일 입력 후 Enter" style="flex:1">
          <button class="btn-red" id="add">ADD</button>
        </div>
        <div id="list" style="margin-top:10px"></div>
      </div>`;
    document.getElementById('list').innerHTML = items.map(t => `
      <div style="display:flex;gap:8px;align-items:center;margin:6px 0">
        <input type="checkbox" data-tog="${t.id}" ${t.done?'checked':''} style="width:auto">
        <span style="flex:1;${t.done?'text-decoration:line-through;opacity:.6':''}">${t.content}</span>
        <button data-del="${t.id}">✕</button></div>`).join('');
    document.querySelectorAll('[data-tog]').forEach(b => b.onchange = async () => {
      await fetchJSON(`/api/todos/${b.dataset.tog}`, { method:'PATCH', body:{ done:b.checked }}); load();
    });
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      await fetchJSON(`/api/todos/${b.dataset.del}`, { method:'DELETE' }); load();
    });
    const add = async () => { const c=document.getElementById('c'); if(!c.value)return;
      await fetchJSON('/api/todos', { method:'POST', body:{ date, content:c.value }}); load(); };
    document.getElementById('add').onclick = add;
    document.getElementById('c').addEventListener('keydown', e => { if(e.key==='Enter') add(); });
  }
  await load();
}
