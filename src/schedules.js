import express from 'express';
import { requireAuth } from './auth.js';

export async function listSchedules(pool, uid, date) {
  const { rows } = await pool.query(
    'SELECT id,date,time,content,remind,repeat FROM schedules WHERE user_id=$1 AND date=$2 ORDER BY time', [uid, date]);
  return rows;
}
export async function datesWithSchedules(pool, uid, month) {
  const { rows } = await pool.query(
    "SELECT DISTINCT date FROM schedules WHERE user_id=$1 AND to_char(date,'YYYY-MM')=$2", [uid, month]);
  return rows.map(r => r.date);
}
export async function addSchedule(pool, uid, s) {
  const { rows } = await pool.query(
    'INSERT INTO schedules(user_id,date,time,content,remind,repeat) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [uid, s.date, s.time, s.content, !!s.remind, s.repeat || 'none']);
  return rows[0];
}
export async function updateSchedule(pool, uid, id, s) {
  await pool.query('UPDATE schedules SET time=$1,content=$2,remind=$3,repeat=$4 WHERE id=$5 AND user_id=$6',
    [s.time, s.content, !!s.remind, s.repeat || 'none', id, uid]);
}
export async function deleteSchedule(pool, uid, id) {
  await pool.query('DELETE FROM schedules WHERE id=$1 AND user_id=$2', [id, uid]);
}
export function schedulesRouter(pool) {
  const r = express.Router();
  r.get('/api/schedules', requireAuth, async (req, res) => res.json(await listSchedules(pool, req.session.userId, req.query.date)));
  r.get('/api/schedules/month', requireAuth, async (req, res) => res.json(await datesWithSchedules(pool, req.session.userId, req.query.month)));
  r.post('/api/schedules', requireAuth, async (req, res) => res.json(await addSchedule(pool, req.session.userId, req.body)));
  r.put('/api/schedules/:id', requireAuth, async (req, res) => { await updateSchedule(pool, req.session.userId, Number(req.params.id), req.body); res.json({ ok: true }); });
  r.delete('/api/schedules/:id', requireAuth, async (req, res) => { await deleteSchedule(pool, req.session.userId, Number(req.params.id)); res.json({ ok: true }); });
  return r;
}
