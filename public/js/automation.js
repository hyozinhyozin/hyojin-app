import { fetchJSON } from '/js/api.js';

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b = (base64 + pad).replace(/-/g,'+').replace(/_/g,'/');
  const raw = atob(b); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
async function subscribePush() {
  if (!('serviceWorker' in navigator)) return;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  const { key } = await fetchJSON('/api/push/key');
  if (!key) return;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array(key) });
  await fetchJSON('/api/push/subscribe', { method:'POST', body: sub });
}

const ITEMS = [
  { key:'reminder', label:'일정 리마인더', desc:'일정 시작 30분 전 아이폰 푸시 알림' },
  { key:'carryover', label:'할 일 이월', desc:'못 끝낸 To-Do를 다음 날로 자동 이월' },
  { key:'repeat', label:'반복 일정', desc:'반복 설정한 일정을 자동으로 다음 날짜에 생성' },
];

export async function renderAutomation(view) {
  const s = await fetchJSON('/api/automation').catch(()=>({reminder:true,carryover:true,repeat:true}));
  view.innerHTML = `<h2 class="display" style="margin:12px 0">AUTOMATION</h2>
    <p>내 자동화 기능 모음 · 켜고 끄면 저장돼요.</p>
    ${ITEMS.map(it => `<div class="panel" style="margin:8px 0;display:flex;justify-content:space-between;align-items:center">
      <div><b>${it.label}</b><br><small>${it.desc}</small></div>
      <label class="switch"><input type="checkbox" data-k="${it.key}" ${s[it.key]?'checked':''} style="width:auto"></label>
    </div>`).join('')}`;
  view.querySelectorAll('[data-k]').forEach(cb => cb.onchange = async () => {
    const next = { ...s }; next[cb.dataset.k] = cb.checked; Object.assign(s, next);
    await fetchJSON('/api/automation', { method:'PUT', body: s });
    if (cb.dataset.k === 'reminder' && cb.checked) await subscribePush();
  });
}
