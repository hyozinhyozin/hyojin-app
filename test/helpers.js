import { newDb, DataType } from 'pg-mem';
import { SCHEMA_SQL } from '../src/db.js';

// pg-mem은 Postgres 네이티브 함수를 거의 구현하지 않으므로, 앱이 쓰는 것만 최소 등록.
function fmtDate(d, fmt) {
  const x = d instanceof Date ? d : new Date(d);
  const Y = x.getFullYear();
  const M = String(x.getMonth() + 1).padStart(2, '0');
  const D = String(x.getDate()).padStart(2, '0');
  return fmt === 'YYYY-MM' ? `${Y}-${M}` : `${Y}-${M}-${D}`;
}

export function makeTestPool() {
  const db = newDb();
  db.public.registerFunction({ name: 'now', returns: 'timestamptz', implementation: () => new Date() });
  // schedules 월별 조회(datesWithSchedules)에서 쓰는 to_char(date,'YYYY-MM')
  db.public.registerFunction({
    name: 'to_char', args: [DataType.date, DataType.text], returns: DataType.text,
    implementation: fmtDate,
  });
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  return { db, pool };
}

export async function seedSchema(pool) {
  await pool.query(SCHEMA_SQL);
}
