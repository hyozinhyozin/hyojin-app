import express from 'express';
import bcrypt from 'bcryptjs';

function sixDigit() { return String(Math.floor(100000 + Math.random() * 900000)); }

export async function attemptLogin(pool, username, password, { sendCode }) {
  const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  const user = rows[0];
  if (!user) return { ok: false, error: 'no_user' };

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const code = sixDigit();
    const exp = new Date(Date.now() + 15 * 60000);
    await pool.query('UPDATE users SET unlock_code=$1, unlock_code_expires=$2 WHERE id=$3',
      [code, exp, user.id]);
    await sendCode(user.email, code);
    return { ok: false, locked: true };
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (match) {
    await pool.query('UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=$1', [user.id]);
    return { ok: true, userId: user.id };
  }

  const attempts = user.failed_attempts + 1;
  if (attempts >= 5) {
    const lockedUntil = new Date(Date.now() + 60 * 60000);
    const code = sixDigit();
    const exp = new Date(Date.now() + 15 * 60000);
    await pool.query(
      'UPDATE users SET failed_attempts=$1, locked_until=$2, unlock_code=$3, unlock_code_expires=$4 WHERE id=$5',
      [attempts, lockedUntil, code, exp, user.id]);
    await sendCode(user.email, code);
    return { ok: false, locked: true };
  }
  await pool.query('UPDATE users SET failed_attempts=$1 WHERE id=$2', [attempts, user.id]);
  return { ok: false, error: 'bad_password', attempts };
}

export async function verifyUnlock(pool, username, code) {
  const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  const user = rows[0];
  if (!user || !user.unlock_code) return { ok: false };
  if (user.unlock_code !== code) return { ok: false };
  if (new Date(user.unlock_code_expires) < new Date()) return { ok: false, expired: true };
  await pool.query(
    'UPDATE users SET failed_attempts=0, locked_until=NULL, unlock_code=NULL, unlock_code_expires=NULL WHERE id=$1',
    [user.id]);
  return { ok: true };
}

export function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

export function authRouter(pool, deps) {
  const r = express.Router();
  r.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await attemptLogin(pool, username, password, { sendCode: deps.sendCode });
    if (result.ok) { req.session.userId = result.userId; return res.json({ ok: true }); }
    res.status(result.locked ? 423 : 401).json(result);
  });
  r.post('/api/unlock', async (req, res) => {
    const { username, code } = req.body;
    const result = await verifyUnlock(pool, username, code);
    res.status(result.ok ? 200 : 400).json(result);
  });
  r.post('/api/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });
  r.get('/api/me', (req, res) => res.json({ authed: !!req.session?.userId }));
  return r;
}
