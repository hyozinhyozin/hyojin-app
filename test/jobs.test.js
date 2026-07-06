import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestPool, seedSchema } from './helpers.js';
import { dueReminders, carryoverTodos } from '../src/jobs.js';

async function u(pool){ const r=await pool.query("INSERT INTO users(username,password_hash,email) VALUES('a','h','e') RETURNING id"); return r.rows[0].id; }

// pg-mem은 DATE를 JS Date로 돌려주고, 실제 pg는 'YYYY-MM-DD' 문자열로 돌려준다. 양쪽 정규화.
function ymd(v){
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
  return String(v).slice(0,10);
}

test('dueReminders returns schedules 30min ahead not yet reminded', async () => {
  const { pool } = makeTestPool(); await seedSchema(pool); const uid = await u(pool);
  await pool.query('INSERT INTO automation_settings(user_id,reminder) VALUES($1,true)', [uid]);
  // 기준 시각 09:00, 일정 09:30 → 리마인더 대상
  await pool.query("INSERT INTO schedules(user_id,date,time,content,remind) VALUES($1,$2,'09:30','미팅',true)",
    [uid, '2026-07-03']);
  const now = new Date('2026-07-03T09:00:00');
  const due = await dueReminders(pool, now);
  assert.equal(due.length, 1);
  assert.equal(due[0].content, '미팅');
});

test('carryoverTodos moves undone todos to today', async () => {
  const { pool } = makeTestPool(); await seedSchema(pool); const uid = await u(pool);
  await pool.query('INSERT INTO automation_settings(user_id,carryover) VALUES($1,true)', [uid]);
  await pool.query("INSERT INTO todos(user_id,date,content,done) VALUES($1,'2026-07-02','안한일',false)", [uid]);
  await pool.query("INSERT INTO todos(user_id,date,content,done) VALUES($1,'2026-07-02','한일',true)", [uid]);
  await carryoverTodos(pool, '2026-07-02', '2026-07-03');
  const { rows } = await pool.query("SELECT date,content FROM todos WHERE user_id=$1 AND done=false", [uid]);
  assert.equal(rows.length, 1);
  assert.equal(ymd(rows[0].date), '2026-07-03');
});
