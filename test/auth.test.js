import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { makeTestPool, seedSchema } from './helpers.js';
import { attemptLogin, verifyUnlock } from '../src/auth.js';

async function seedUser(pool) {
  const hash = await bcrypt.hash('pw123', 4);
  await pool.query('INSERT INTO users(username,password_hash,email) VALUES($1,$2,$3)',
    ['hyojin', hash, 'me@example.com']);
}

test('correct password logs in', async () => {
  const { pool } = makeTestPool(); await seedSchema(pool); await seedUser(pool);
  const r = await attemptLogin(pool, 'hyojin', 'pw123', { sendCode: async () => {} });
  assert.equal(r.ok, true);
});

test('locks after 5 failures', async () => {
  const { pool } = makeTestPool(); await seedSchema(pool); await seedUser(pool);
  let sent = null;
  const opts = { sendCode: async (email, code) => { sent = { email, code }; } };
  for (let i = 0; i < 5; i++) await attemptLogin(pool, 'hyojin', 'wrong', opts);
  const r = await attemptLogin(pool, 'hyojin', 'pw123', opts);
  assert.equal(r.locked, true);
  assert.ok(sent && sent.code.length === 6, 'unlock code emailed');
});

test('unlock code clears lock', async () => {
  const { pool } = makeTestPool(); await seedSchema(pool); await seedUser(pool);
  let code = null;
  const opts = { sendCode: async (e, c) => { code = c; } };
  for (let i = 0; i < 6; i++) await attemptLogin(pool, 'hyojin', 'wrong', opts);
  const u = await verifyUnlock(pool, 'hyojin', code);
  assert.equal(u.ok, true);
  const r = await attemptLogin(pool, 'hyojin', 'pw123', opts);
  assert.equal(r.ok, true);
});
