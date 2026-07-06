const CACHE = 'hyojin-v1';
const SHELL = ['/', '/index.html', '/login.html', '/css/app.css', '/js/api.js', '/js/app.js',
  '/js/calendar.js', '/js/schedule.js', '/js/todo.js', '/js/automation.js', '/manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.pathname.startsWith('/api/')) return; // API는 항상 네트워크
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title:'HYOJIN', body:'' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon:'/icons/icon-192.png' }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow('/')); });
