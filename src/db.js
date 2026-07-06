import pg from 'pg';

// DATE 컬럼(OID 1082)을 JS Date로 변환하지 않고 'YYYY-MM-DD' 문자열 그대로 반환.
// (기본 파서는 로컬 자정 Date로 만들어 JSON 직렬화 시 타임존만큼 날짜가 밀린다)
pg.types.setTypeParser(1082, (v) => v);

export function createPool(connectionString) {
  return new pg.Pool({ connectionString, ssl: connectionString?.includes('localhost') ? false : { rejectUnauthorized: false } });
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  unlock_code TEXT,
  unlock_code_expires TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  content TEXT NOT NULL,
  remind BOOLEAN NOT NULL DEFAULT false,
  reminded BOOLEAN NOT NULL DEFAULT false,
  repeat TEXT NOT NULL DEFAULT 'none',
  repeat_parent_id INT
);
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  content TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memos (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  UNIQUE(user_id, date)
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS automation_settings (
  user_id INT PRIMARY KEY REFERENCES users(id),
  reminder BOOLEAN NOT NULL DEFAULT true,
  carryover BOOLEAN NOT NULL DEFAULT true,
  repeat BOOLEAN NOT NULL DEFAULT true
);
`;

export async function migrate(pool) {
  await pool.query(SCHEMA_SQL);
}
