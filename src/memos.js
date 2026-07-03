import express from 'express';
import { requireAuth } from './auth.js';

export async function getMemo(pool, uid, date) {
  const { rows } = await pool.query('SELECT content FROM memos WHERE user_id=$1 AND date=$2', [uid, date]);
  return rows[0]?.content ?? '';
}
export async function putMemo(pool, uid, date, content) {
  await pool.query(
    `INSERT INTO memos(user_id,date,content) VALUES($1,$2,$3)
     ON CONFLICT (user_id,date) DO UPDATE SET content=$3`, [uid, date, content]);
}
export function memosRouter(pool) {
  const r = express.Router();
  r.get('/api/memos', requireAuth, async (req, res) => res.json({ content: await getMemo(pool, req.session.userId, req.query.date) }));
  r.put('/api/memos', requireAuth, async (req, res) => { await putMemo(pool, req.session.userId, req.body.date, req.body.content); res.json({ ok: true }); });
  return r;
}
