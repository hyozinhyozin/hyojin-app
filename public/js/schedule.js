import { fetchJSON } from '/js/api.js';

export async function renderSchedule(view, param) {
  let date = param || new Date().toISOString().slice(0,10);
  async function load() {
    const items = await fetchJSON(`/api/schedules?date=${date}`).catch(()=>[]);
    const memo = await fetchJSON(`/api/memos?date=${date}`).catch(()=>({content:''}));
    view.innerHTML = `
      <a href="#calendar" style="font-weight:800;color:#111">‹ CALENDAR</a>
      <div style="display:flex;align-items:center;gap:10px;margin:10px 0">
        <button id="prev">◀</button><h2 class="display" style="margin:0">${date}</h2><button id="next">▶</button>
      </div>
      <div class="panel">
        <h3>SCHEDULE</h3>
        <div id="list"></div>
        <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
          <input id="t" type="time" style="width:auto" value="09:00">
          <input id="c" placeholder="일정을 입력하세요" style="flex:1">
          <label style="color:#f6e01e"><input type="checkbox" id="rm" style="width:auto"> 리마인더</label>
          <select id="rp" style="width:auto"><option value="none">반복없음</option><option value="daily">매일</option><option value="weekly">매주</option></select>
          <button class="btn-red" id="add">+ 추가</button>
        </div>
      </div>
      <div class="panel" style="margin-top:12px">
        <h3>MEMO</h3>
        <textarea id="memo" rows="5" style="width:100%">${memo.content}</textarea>
      </div>`;
    const list = document.getElementById('list');
    list.innerHTML = items.map(s => `<div style="display:flex;gap:8px;align-items:center;margin:6px 0">
      <b>${s.time}</b><span style="flex:1">${s.content}</span>
      ${s.remind?'🔔':''}${s.repeat!=='none'?'🔁':''}
      <button data-del="${s.id}">✕</button></div>`).join('') || '<p>일정 없음</p>';
    list.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      await fetchJSON(`/api/schedules/${b.dataset.del}`, { method:'DELETE' }); load();
    });
    document.getElementById('add').onclick = async () => {
      const body = { date, time:document.getElementById('t').value, content:document.getElementById('c').value,
        remind:document.getElementById('rm').checked, repeat:document.getElementById('rp').value };
      if (!body.content) return;
      await fetchJSON('/api/schedules', { method:'POST', body }); load();
    };
    let mt; document.getElementById('memo').oninput = (e) => {
      clearTimeout(mt); mt = setTimeout(() => fetchJSON('/api/memos', { method:'PUT', body:{ date, content:e.target.value }}), 500);
    };
    document.getElementById('prev').onclick = () => { date = shift(date,-1); location.hash = `#schedule/${date}`; load(); };
    document.getElementById('next').onclick = () => { date = shift(date,1); location.hash = `#schedule/${date}`; load(); };
  }
  function shift(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); }
  await load();
}
