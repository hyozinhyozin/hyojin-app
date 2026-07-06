import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { makeTestPool } from './helpers.js';
import { createApp } from '../src/server.js';

test('login then create and list a todo', async () => {
  const { pool } = makeTestPool();
  const app = await createApp(pool, { NODE_ENV: 'test', SESSION_SECRET: 't' });
  const hash = await bcrypt.hash('pw123', 4);
  await pool.query('INSERT INTO users(username,password_hash,email) VALUES($1,$2,$3)', ['hyojin', hash, 'e@e.com']);
  const agent = request.agent(app);
  const login = await agent.post('/api/login').send({ username: 'hyojin', password: 'pw123' });
  assert.equal(login.status, 200);
  await agent.post('/api/todos').send({ date: '2026-07-03', content: '물' });
  const list = await agent.get('/api/todos?date=2026-07-03');
  assert.equal(list.body.length, 1);
});

test('unauthenticated request is rejected', async () => {
  const { pool } = makeTestPool();
  const app = await createApp(pool, { NODE_ENV: 'test', SESSION_SECRET: 't' });
  const res = await request(app).get('/api/todos?date=2026-07-03');
  assert.equal(res.status, 401);
});
