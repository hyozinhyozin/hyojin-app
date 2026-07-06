import { fetchJSON } from '/js/api.js';
const WD = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
let cur = new Date();

export async function renderCalendar(view) {
  const y = cur.getFullYear(), m = cur.getMonth();
  const month = `${y}-${String(m+1).padStart(2,'0')}`;
  const dates = await fetchJSON(`/api/schedules/month?month=${month}`).catch(()=>[]);
  const hasSched = new Set(dates.map(d => String(d).slice(0,10)));
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m+1, 0).getDate();
  const today = new Date().toISOString().slice(0,10);
  let cells = '';
  for (let i=0;i<first;i++) cells += '<div></div>';
  for (let d=1; d<=days; d++) {
    const ds = `${month}-${String(d).padStart(2,'0')}`;
    const isToday = ds === today;
    cells += `<a href="#schedule/${ds}" style="text-decoration:none">
      <div class="panel" style="min-height:64px;${isToday?'background:#e63329;color:#fff':''}">
        <b>${d}</b>${hasSched.has(ds)?' <span style="color:#f6e01e">•</span>':''}
      </div></a>`;
  }
  view.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin:12px 0">
      <button id="prev">◀</button><h2 class="display" style="margin:0">${y}. ${String(m+1).padStart(2,'0')}</h2><button id="next">▶</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;font-weight:800;text-align:center">
      ${WD.map(w=>`<div>${w}</div>`).join('')}${cells}
    </div>`;
  document.getElementById('prev').onclick = () => { cur = new Date(y, m-1, 1); renderCalendar(view); };
  document.getElementById('next').onclick = () => { cur = new Date(y, m+1, 1); renderCalendar(view); };
}
