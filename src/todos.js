import express from 'express';
import { requireAuth } from './auth.js';

export async function listTodos(pool, uid, date) {
  const { rows } = await pool.query(
    'SELECT id,content,done,date FROM todos WHERE user_id=$1 AND date=$2 ORDER BY created_at', [uid, date]);
  return rows;
}
export async function addTodo(pool, uid, date, content) {
  const { rows } = await pool.query(
    'INSERT INTO todos(user_id,date,content) VALUES($1,$2,$3) RETURNING id,content,done,date', [uid, date, content]);
  return rows[0];
}
export async function toggleTodo(pool, uid, id, done) {
  await pool.query('UPDATE todos SET done=$1 WHERE id=$2 AND user_id=$3', [done, id, uid]);
}
export async function deleteTodo(pool, uid, id) {
  await pool.query('DELETE FROM todos WHERE id=$1 AND user_id=$2', [id, uid]);
}
export function todosRouter(pool) {
  const r = express.Router();
  r.get('/api/todos', requireAuth, async (req, res) => res.json(await listTodos(pool, req.session.userId, req.query.date)));
  r.post('/api/todos', requireAuth, async (req, res) => res.json(await addTodo(pool, req.session.userId, req.body.date, req.body.content)));
  r.patch('/api/todos/:id', requireAuth, async (req, res) => { await toggleTodo(pool, req.session.userId, Number(req.params.id), req.body.done); res.json({ ok: true }); });
  r.delete('/api/todos/:id', requireAuth, async (req, res) => { await deleteTodo(pool, req.session.userId, Number(req.params.id)); res.json({ ok: true }); });
  return r;
}
