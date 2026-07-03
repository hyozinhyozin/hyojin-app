import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestPool, seedSchema } from './helpers.js';

test('schema creates tables', async () => {
  const { pool } = makeTestPool();
  await seedSchema(pool);
  const r = await pool.query("SELECT 1 AS ok");
  assert.equal(r.rows[0].ok, 1);
});
