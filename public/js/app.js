import { fetchJSON } from '/js/api.js';
import { renderCalendar } from '/js/calendar.js';
import { renderSchedule } from '/js/schedule.js';
import { renderTodo } from '/js/todo.js';
import { renderAutomation } from '/js/automation.js';

const view = document.getElementById('view');
const routes = { calendar: renderCalendar, schedule: renderSchedule, todo: renderTodo, automation: renderAutomation };

async function guard() {
  const me = await fetchJSON('/api/me').catch(() => ({ authed: false }));
  if (!me.authed) { location.href = '/login.html'; return false; }
  return true;
}
function setActive(name){ document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.hash === '#'+name)); }
async function route() {
  const [name, param] = location.hash.slice(1).split('/');
  const fn = routes[name] || renderCalendar;
  setActive(name || 'calendar');
  view.innerHTML = '';
  await fn(view, param);
}
document.getElementById('logout').onclick = async (e) => { e.preventDefault(); await fetchJSON('/api/logout',{method:'POST'}); location.href='/login.html'; };
window.addEventListener('hashchange', route);
if (await guard()) { if (!location.hash) location.hash = '#calendar'; route(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
