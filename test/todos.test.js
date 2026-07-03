import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestPool, seedSchema } from './helpers.js';
import { listTodos, addTodo, toggleTodo, deleteTodo } from '../src/todos.js';

async function u(pool){ const r=await pool.query("INSERT INTO users(username,password_hash,email) VALUES('a','h','e') RETURNING id"); return r.rows[0].id; }

test('add and list todos by date', async () => {
  const { pool } = makeTestPool(); await seedSchema(pool); const uid = await u(pool);
  await addTodo(pool, uid, '2026-07-03', '물 마시기');
  const list = await listTodos(pool, uid, '2026-07-03');
  assert.equal(list.length, 1);
  assert.equal(list[0].content, '물 마시기');
  assert.equal(list[0].done, false);
});

test('toggle and delete todo', async () => {
  const { pool } = makeTestPool(); await seedSchema(pool); const uid = await u(pool);
  const t = await addTodo(pool, uid, '2026-07-03', 'x');
  await toggleTodo(pool, uid, t.id, true);
  let list = await listTodos(pool, uid, '2026-07-03');
  assert.equal(list[0].done, true);
  await deleteTodo(pool, uid, t.id);
  list = await listTodos(pool, uid, '2026-07-03');
  assert.equal(list.length, 0);
});
