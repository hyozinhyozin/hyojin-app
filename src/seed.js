import bcrypt from 'bcryptjs';
import { createPool, migrate } from './db.js';

try { process.loadEnvFile?.(); } catch { /* .env 없음 — 무시 */ }

const [,, username, password, email] = process.argv;
if (!username || !password || !email) { console.error('usage: node src/seed.js <username> <password> <email>'); process.exit(1); }
const pool = createPool(process.env.DATABASE_URL);
await migrate(pool);
const hash = await bcrypt.hash(password, 10);
await pool.query(
  `INSERT INTO users(username,password_hash,email) VALUES($1,$2,$3)
   ON CONFLICT (username) DO UPDATE SET password_hash=$2, email=$3`, [username, hash, email]);
console.log('user ready:', username);
await pool.end();
