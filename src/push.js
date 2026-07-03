import express from 'express';
import webpush from 'web-push';
import { requireAuth } from './auth.js';

export function configurePush(env = process.env) {
  if (env.VAPID_PUBLIC && env.VAPID_PRIVATE) {
    webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:you@example.com', env.VAPID_PUBLIC, env.VAPID_PRIVATE);
  }
}

export async function sendPush(pool, userId, payload) {
  const { rows } = await pool.query('SELECT id,subscription FROM push_subscriptions WHERE user_id=$1', [userId]);
  for (const row of rows) {
    try { await webpush.sendNotification(row.subscription, JSON.stringify(payload)); }
    catch (e) { if (e.statusCode === 410 || e.statusCode === 404) await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [row.id]); }
  }
}

export function pushRouter(pool, env = process.env) {
  const r = express.Router();
  r.get('/api/push/key', (req, res) => res.json({ key: env.VAPID_PUBLIC || '' }));
  r.post('/api/push/subscribe', requireAuth, async (req, res) => {
    await pool.query('INSERT INTO push_subscriptions(user_id,subscription) VALUES($1,$2)', [req.session.userId, req.body]);
    res.json({ ok: true });
  });
  return r;
}
