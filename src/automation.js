import express from 'express';
import { requireAuth } from './auth.js';

export async function getSettings(pool, uid) {
  await pool.query('INSERT INTO automation_settings(user_id) VALUES($1) ON CONFLICT DO NOTHING', [uid]);
  const { rows } = await pool.query('SELECT reminder,carryover,repeat FROM automation_settings WHERE user_id=$1', [uid]);
  return rows[0];
}
export async function putSettings(pool, uid, s) {
  await pool.query(
    `INSERT INTO automation_settings(user_id,reminder,carryover,repeat) VALUES($1,$2,$3,$4)
     ON CONFLICT (user_id) DO UPDATE SET reminder=$2,carryover=$3,repeat=$4`,
    [uid, !!s.reminder, !!s.carryover, !!s.repeat]);
}
export function automationRouter(pool) {
  const r = express.Router();
  r.get('/api/automation', requireAuth, async (req, res) => res.json(await getSettings(pool, req.session.userId)));
  r.put('/api/automation', requireAuth, async (req, res) => { await putSettings(pool, req.session.userId, req.body); res.json({ ok: true }); });
  return r;
}
