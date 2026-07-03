import { newDb } from 'pg-mem';
import { SCHEMA_SQL } from '../src/db.js';

export function makeTestPool() {
  const db = newDb();
  db.public.registerFunction({ name: 'now', returns: 'timestamptz', implementation: () => new Date() });
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  return { db, pool };
}

export async function seedSchema(pool) {
  await pool.query(SCHEMA_SQL);
}
