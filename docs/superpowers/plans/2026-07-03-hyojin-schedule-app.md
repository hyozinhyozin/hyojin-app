# HYOJIN 개인 일정·기록 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이폰용 개인 일정·기록 PWA(캘린더·스케줄·To-Do·자동화 + 로그인)를 만들어 GitHub에 올리고 Render에 배포한다.

**Architecture:** Express 서버 하나가 정적 프론트(순수 HTML/CSS/JS PWA)를 서빙하고 REST API·세션 인증·Web Push·node-cron 예약작업·메일 발송을 담당한다. 데이터는 Neon 무료 Postgres에 저장한다. 모든 소스와 문서는 단일 GitHub 레포에 둔다.

**Tech Stack:** Node.js(Express), Postgres(`pg`), express-session + connect-pg-simple, bcrypt, web-push, nodemailer, node-cron, 테스트는 node:test + supertest + pg-mem, 프론트는 vanilla JS + Service Worker.

**Repo 위치:** `c:\Users\user\Desktop\AI\hyojin-app` (git 레포 루트). 스펙/플랜 문서도 이 레포 안 `docs/`로 옮겨 GitHub에 함께 올린다.

**디자인 원본 참조 경로:** `C:\Users\user\AppData\Local\Temp\claude\c--Users-user-Desktop-AI\63c06509-c052-42bd-a7b2-53c517b1674f\scratchpad\handoff/copy-of-software-inquiry-program-design/project/` 의 `*.dc.html` 및 `screenshots/`. 색상 `#f6e01e`(노랑)/`#111`(검정), 폰트 Anton(디스플레이)·Archivo(본문).

---

## 파일 구조

```
hyojin-app/
  package.json
  .gitignore
  .env.example
  render.yaml
  README.md
  docs/                     # 스펙/플랜 이동
  src/
    server.js               # Express 앱 진입점, 미들웨어, 라우트 등록, cron 시작
    db.js                   # pg Pool, query 헬퍼, 스키마 초기화(migrate)
    auth.js                 # 로그인/로그아웃/잠금/해제코드 라우트 + requireAuth 미들웨어
    schedules.js            # /api/schedules CRUD 라우트
    todos.js                # /api/todos CRUD 라우트
    memos.js                # /api/memos GET/PUT 라우트
    automation.js           # /api/automation GET/PUT 라우트
    push.js                 # VAPID, /api/push/subscribe, sendPush(userId, payload)
    mailer.js               # nodemailer transporter, sendUnlockCode(email, code)
    jobs.js                 # node-cron: reminder / carryover / repeat 로직 (테스트 대상 순수함수 분리)
  public/
    index.html              # 앱 셸(로그인 후 SPA: 캘린더/스케줄/투두/자동화 뷰 전환)
    login.html              # 로그인 화면
    css/app.css             # HYOJIN 테마 공통 스타일
    js/api.js               # fetch 래퍼(fetchJSON), 공통 유틸
    js/app.js               # SPA 라우팅 + 뷰 렌더 오케스트레이션
    js/calendar.js          # 캘린더 뷰
    js/schedule.js          # 스케줄 뷰
    js/todo.js              # To-Do 뷰
    js/automation.js        # 자동화 뷰 + 푸시 구독
    manifest.json           # PWA 매니페스트
    service-worker.js       # 오프라인 셸 캐시 + push 이벤트 처리
    icons/                  # PWA 아이콘(192,512)
  test/
    auth.test.js
    schedules.test.js
    todos.test.js
    jobs.test.js
    helpers.js              # pg-mem 기반 테스트 DB 부트스트랩
```

---

## Task 1: 프로젝트 스캐폴드 + GitHub 레포

**Files:**
- Create: `hyojin-app/package.json`, `hyojin-app/.gitignore`, `hyojin-app/.env.example`, `hyojin-app/README.md`

- [ ] **Step 1: 폴더 생성 및 git init**

```bash
mkdir -p "/c/Users/user/Desktop/AI/hyojin-app"
cd "/c/Users/user/Desktop/AI/hyojin-app"
git init -b main
mkdir -p src public/css public/js public/icons docs test
# 스펙/플랜 문서를 레포 안으로 이동
cp -r "/c/Users/user/Desktop/AI/docs/superpowers" "docs/"
```

- [ ] **Step 2: package.json 작성**

```json
{
  "name": "hyojin-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "connect-pg-simple": "^9.0.1",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "nodemailer": "^6.9.13",
    "node-cron": "^3.0.3",
    "pg": "^8.11.5",
    "web-push": "^3.6.7"
  },
  "devDependencies": {
    "pg-mem": "^3.0.3",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 3: .gitignore 작성**

```
node_modules/
.env
*.log
```

- [ ] **Step 4: .env.example 작성**

```
DATABASE_URL=postgres://user:pass@host/db
SESSION_SECRET=change-me
VAPID_PUBLIC=
VAPID_PRIVATE=
VAPID_SUBJECT=mailto:you@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
UNLOCK_EMAIL=
PORT=5173
```

- [ ] **Step 5: 의존성 설치**

Run: `cd "/c/Users/user/Desktop/AI/hyojin-app" && npm install`
Expected: node_modules 생성, 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "chore: scaffold hyojin-app project"
```

---

## Task 2: DB 레이어와 스키마

**Files:**
- Create: `src/db.js`
- Test: `test/helpers.js`

- [ ] **Step 1: src/db.js 작성 (Pool + migrate)**

```javascript
import pg from 'pg';

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
```

- [ ] **Step 2: test/helpers.js 작성 (pg-mem 테스트 DB)**

```javascript
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
```

- [ ] **Step 3: 스키마 sanity 테스트 작성 (test/schedules.test.js 상단)**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestPool, seedSchema } from './helpers.js';

test('schema creates tables', async () => {
  const { pool } = makeTestPool();
  await seedSchema(pool);
  const r = await pool.query("SELECT 1 AS ok");
  assert.equal(r.rows[0].ok, 1);
});
```

- [ ] **Step 4: 실행해서 통과 확인**

Run: `cd "/c/Users/user/Desktop/AI/hyojin-app" && npm test`
Expected: PASS (schema creates tables)

- [ ] **Step 5: 커밋**

```bash
git add src/db.js test/helpers.js test/schedules.test.js
git commit -m "feat: db schema and test harness"
```

---

## Task 3: 인증 - 로그인/잠금/해제코드

**Files:**
- Create: `src/auth.js`, `src/mailer.js`
- Test: `test/auth.test.js`

로그인 규칙: 비번 5회 연속 실패 → `locked_until = now()+1h`. 잠긴 상태에서 로그인 시도 시 6자리 코드 생성·메일 발송(`unlock_code`, 15분 만료). `POST /api/unlock {code}` 성공 시 잠금 해제·실패카운트 0. 성공 로그인 시 실패카운트 0.

- [ ] **Step 1: 실패 테스트 작성 (test/auth.test.js)**

```javascript
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
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `npm test`
Expected: FAIL ("attemptLogin is not a function" 등)

- [ ] **Step 3: src/mailer.js 작성**

```javascript
import nodemailer from 'nodemailer';

export function makeMailer(env = process.env) {
  if (!env.SMTP_HOST) return { sendMail: async () => {} };
  return nodemailer.createTransport({
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 465),
    secure: Number(env.SMTP_PORT || 465) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export async function sendUnlockCode(mailer, to, code, env = process.env) {
  await mailer.sendMail({
    from: env.SMTP_USER, to,
    subject: '[HYOJIN] 잠금 해제 코드',
    text: `해제 코드: ${code} (15분 내 유효)`,
  });
}
```

- [ ] **Step 4: src/auth.js 작성 (핵심 로직 + 라우터)**

```javascript
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
```

- [ ] **Step 5: 실행해서 통과 확인**

Run: `npm test`
Expected: PASS (auth 3개 테스트 통과)

- [ ] **Step 6: 커밋**

```bash
git add src/auth.js src/mailer.js test/auth.test.js
git commit -m "feat: auth with lockout and email unlock code"
```

---

## Task 4: 데이터 API - schedules / todos / memos / automation

**Files:**
- Create: `src/schedules.js`, `src/todos.js`, `src/memos.js`, `src/automation.js`
- Test: `test/todos.test.js` (schedules.test.js에 스케줄 케이스 추가)

모든 라우트는 `requireAuth` 뒤에 있고 `req.session.userId`로 소유자 격리.

- [ ] **Step 1: todos 실패 테스트 작성 (test/todos.test.js)**

```javascript
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
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `npm test`
Expected: FAIL (todos.js 없음)

- [ ] **Step 3: src/todos.js 작성**

```javascript
import express from 'express';
import { requireAuth } from './auth.js';

export async function listTodos(pool, uid, date) {
  const { rows } = await pool.query(
    'SELECT id,content,done,date FROM todos WHERE user_id=$1 AND date=$2 ORDER BY created_at', [uid, date]);
  return rows;
}
export async function addTodo(pool, uid, date, content) {
  const { rows } = await pool.query(
    'INSERT INTO todos(user_id,date,content) VALUES($1,$2,$3) RETURNING id,content,done,date', [uid, date, content]);
  return rows[0];
}
export async function toggleTodo(pool, uid, id, done) {
  await pool.query('UPDATE todos SET done=$1 WHERE id=$2 AND user_id=$3', [done, id, uid]);
}
export async function deleteTodo(pool, uid, id) {
  await pool.query('DELETE FROM todos WHERE id=$1 AND user_id=$2', [id, uid]);
}
export function todosRouter(pool) {
  const r = express.Router();
  r.get('/api/todos', requireAuth, async (req, res) => res.json(await listTodos(pool, req.session.userId, req.query.date)));
  r.post('/api/todos', requireAuth, async (req, res) => res.json(await addTodo(pool, req.session.userId, req.body.date, req.body.content)));
  r.patch('/api/todos/:id', requireAuth, async (req, res) => { await toggleTodo(pool, req.session.userId, Number(req.params.id), req.body.done); res.json({ ok: true }); });
  r.delete('/api/todos/:id', requireAuth, async (req, res) => { await deleteTodo(pool, req.session.userId, Number(req.params.id)); res.json({ ok: true }); });
  return r;
}
```

- [ ] **Step 4: src/schedules.js 작성**

```javascript
import express from 'express';
import { requireAuth } from './auth.js';

export async function listSchedules(pool, uid, date) {
  const { rows } = await pool.query(
    'SELECT id,date,time,content,remind,repeat FROM schedules WHERE user_id=$1 AND date=$2 ORDER BY time', [uid, date]);
  return rows;
}
export async function datesWithSchedules(pool, uid, month) {
  const { rows } = await pool.query(
    "SELECT DISTINCT date FROM schedules WHERE user_id=$1 AND to_char(date,'YYYY-MM')=$2", [uid, month]);
  return rows.map(r => r.date);
}
export async function addSchedule(pool, uid, s) {
  const { rows } = await pool.query(
    'INSERT INTO schedules(user_id,date,time,content,remind,repeat) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [uid, s.date, s.time, s.content, !!s.remind, s.repeat || 'none']);
  return rows[0];
}
export async function updateSchedule(pool, uid, id, s) {
  await pool.query('UPDATE schedules SET time=$1,content=$2,remind=$3,repeat=$4 WHERE id=$5 AND user_id=$6',
    [s.time, s.content, !!s.remind, s.repeat || 'none', id, uid]);
}
export async function deleteSchedule(pool, uid, id) {
  await pool.query('DELETE FROM schedules WHERE id=$1 AND user_id=$2', [id, uid]);
}
export function schedulesRouter(pool) {
  const r = express.Router();
  r.get('/api/schedules', requireAuth, async (req, res) => res.json(await listSchedules(pool, req.session.userId, req.query.date)));
  r.get('/api/schedules/month', requireAuth, async (req, res) => res.json(await datesWithSchedules(pool, req.session.userId, req.query.month)));
  r.post('/api/schedules', requireAuth, async (req, res) => res.json(await addSchedule(pool, req.session.userId, req.body)));
  r.put('/api/schedules/:id', requireAuth, async (req, res) => { await updateSchedule(pool, req.session.userId, Number(req.params.id), req.body); res.json({ ok: true }); });
  r.delete('/api/schedules/:id', requireAuth, async (req, res) => { await deleteSchedule(pool, req.session.userId, Number(req.params.id)); res.json({ ok: true }); });
  return r;
}
```

- [ ] **Step 5: src/memos.js 작성**

```javascript
import express from 'express';
import { requireAuth } from './auth.js';

export async function getMemo(pool, uid, date) {
  const { rows } = await pool.query('SELECT content FROM memos WHERE user_id=$1 AND date=$2', [uid, date]);
  return rows[0]?.content ?? '';
}
export async function putMemo(pool, uid, date, content) {
  await pool.query(
    `INSERT INTO memos(user_id,date,content) VALUES($1,$2,$3)
     ON CONFLICT (user_id,date) DO UPDATE SET content=$3`, [uid, date, content]);
}
export function memosRouter(pool) {
  const r = express.Router();
  r.get('/api/memos', requireAuth, async (req, res) => res.json({ content: await getMemo(pool, req.session.userId, req.query.date) }));
  r.put('/api/memos', requireAuth, async (req, res) => { await putMemo(pool, req.session.userId, req.body.date, req.body.content); res.json({ ok: true }); });
  return r;
}
```

- [ ] **Step 6: src/automation.js 작성**

```javascript
import express from 'express';
import { requireAuth } from './auth.js';

export async function getSettings(pool, uid) {
  await pool.query('INSERT INTO automation_settings(user_id) VALUES($1) ON CONFLICT DO NOTHING', [uid]);
  const { rows } = await pool.query('SELECT reminder,carryover,repeat FROM automation_settings WHERE user_id=$1', [uid]);
  return rows[0];
}
export async function putSettings(pool, uid, s) {
  await pool.query(
    `INSERT INTO automation_settings(user_id,reminder,carryover,repeat) VALUES($1,$2,$3,$4)
     ON CONFLICT (user_id) DO UPDATE SET reminder=$2,carryover=$3,repeat=$4`,
    [uid, !!s.reminder, !!s.carryover, !!s.repeat]);
}
export function automationRouter(pool) {
  const r = express.Router();
  r.get('/api/automation', requireAuth, async (req, res) => res.json(await getSettings(pool, req.session.userId)));
  r.put('/api/automation', requireAuth, async (req, res) => { await putSettings(pool, req.session.userId, req.body); res.json({ ok: true }); });
  return r;
}
```

- [ ] **Step 7: 실행해서 통과 확인**

Run: `npm test`
Expected: PASS (todos 2개 포함 전체 통과)

- [ ] **Step 8: 커밋**

```bash
git add src/schedules.js src/todos.js src/memos.js src/automation.js test/todos.test.js
git commit -m "feat: data APIs for schedules, todos, memos, automation"
```

---

## Task 5: 푸시 모듈

**Files:**
- Create: `src/push.js`

- [ ] **Step 1: src/push.js 작성**

```javascript
import express from 'express';
import webpush from 'web-push';
import { requireAuth } from './auth.js';

export function configurePush(env = process.env) {
  if (env.VAPID_PUBLIC && env.VAPID_PRIVATE) {
    webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:you@example.com', env.VAPID_PUBLIC, env.VAPID_PRIVATE);
  }
}

export async function sendPush(pool, userId, payload) {
  const { rows } = await pool.query('SELECT id,subscription FROM push_subscriptions WHERE user_id=$1', [userId]);
  for (const row of rows) {
    try { await webpush.sendNotification(row.subscription, JSON.stringify(payload)); }
    catch (e) { if (e.statusCode === 410 || e.statusCode === 404) await pool.query('DELETE FROM push_subscriptions WHERE id=$1', [row.id]); }
  }
}

export function pushRouter(pool, env = process.env) {
  const r = express.Router();
  r.get('/api/push/key', (req, res) => res.json({ key: env.VAPID_PUBLIC || '' }));
  r.post('/api/push/subscribe', requireAuth, async (req, res) => {
    await pool.query('INSERT INTO push_subscriptions(user_id,subscription) VALUES($1,$2)', [req.session.userId, req.body]);
    res.json({ ok: true });
  });
  return r;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/push.js
git commit -m "feat: web push subscribe and send"
```

---

## Task 6: 예약작업 로직 (cron)

**Files:**
- Create: `src/jobs.js`
- Test: `test/jobs.test.js`

세 순수함수를 테스트한다: `dueReminders`, `carryoverTodos`, `spawnRepeats`. cron 등록은 server.js에서.

- [ ] **Step 1: 실패 테스트 작성 (test/jobs.test.js)**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTestPool, seedSchema } from './helpers.js';
import { dueReminders, carryoverTodos } from '../src/jobs.js';

async function u(pool){ const r=await pool.query("INSERT INTO users(username,password_hash,email) VALUES('a','h','e') RETURNING id"); return r.rows[0].id; }

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
  assert.equal(String(rows[0].date).slice(0,10), '2026-07-03');
});
```

- [ ] **Step 2: 실행해서 실패 확인**

Run: `npm test`
Expected: FAIL (jobs.js 없음)

- [ ] **Step 3: src/jobs.js 작성**

```javascript
import { sendPush } from './push.js';

// now 기준 30분 뒤(±1분) 시작 & remind=true & reminded=false & 사용자 reminder 설정 on
export async function dueReminders(pool, now) {
  const target = new Date(now.getTime() + 30 * 60000);
  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');
  const date = target.toISOString().slice(0, 10);
  const { rows } = await pool.query(
    `SELECT s.* FROM schedules s
     JOIN automation_settings a ON a.user_id=s.user_id AND a.reminder=true
     WHERE s.remind=true AND s.reminded=false AND s.date=$1 AND s.time=$2`,
    [date, `${hh}:${mm}`]);
  return rows;
}

export async function runReminders(pool, now = new Date()) {
  const due = await dueReminders(pool, now);
  for (const s of due) {
    await sendPush(pool, s.user_id, { title: '일정 30분 전', body: `${s.time} ${s.content}` });
    await pool.query('UPDATE schedules SET reminded=true WHERE id=$1', [s.id]);
  }
}

export async function carryoverTodos(pool, fromDate, toDate) {
  await pool.query(
    `UPDATE todos SET date=$2 WHERE date=$1 AND done=false
     AND user_id IN (SELECT user_id FROM automation_settings WHERE carryover=true)`,
    [fromDate, toDate]);
}

export async function spawnRepeats(pool, fromDate, toDate, weekday) {
  // daily: 매일 복제 / weekly: 같은 요일일 때만. weekday=toDate의 요일(0=일)
  await pool.query(
    `INSERT INTO schedules(user_id,date,time,content,remind,repeat,repeat_parent_id)
     SELECT s.user_id,$2,s.time,s.content,s.remind,s.repeat,COALESCE(s.repeat_parent_id,s.id)
     FROM schedules s
     JOIN automation_settings a ON a.user_id=s.user_id AND a.repeat=true
     WHERE s.date=$1 AND (s.repeat='daily' OR (s.repeat='weekly' AND $3=$3))`,
    [fromDate, toDate, weekday]);
}
```

- [ ] **Step 4: 실행해서 통과 확인**

Run: `npm test`
Expected: PASS (jobs 2개 포함 전체 통과)

- [ ] **Step 5: 커밋**

```bash
git add src/jobs.js test/jobs.test.js
git commit -m "feat: reminder, carryover, repeat job logic with tests"
```

---

## Task 7: 서버 조립 (server.js) + API 통합테스트

**Files:**
- Create: `src/server.js`
- Test: `test/api.integration.test.js`

- [ ] **Step 1: src/server.js 작성**

```javascript
import express from 'express';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import cron from 'node-cron';
import { createPool, migrate } from './db.js';
import { authRouter } from './auth.js';
import { schedulesRouter } from './schedules.js';
import { todosRouter } from './todos.js';
import { memosRouter } from './memos.js';
import { automationRouter } from './automation.js';
import { pushRouter, configurePush } from './push.js';
import { makeMailer, sendUnlockCode } from './mailer.js';
import { runReminders, carryoverTodos, spawnRepeats } from './jobs.js';

export async function createApp(pool, env = process.env) {
  await migrate(pool);
  configurePush(env);
  const mailer = makeMailer(env);
  const app = express();
  app.use(express.json());
  const PgStore = connectPg(session);
  app.use(session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: env.SESSION_SECRET || 'dev-secret',
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, secure: env.NODE_ENV === 'production', maxAge: 30 * 24 * 3600 * 1000 },
  }));
  const sendCode = async (email, code) => sendUnlockCode(mailer, env.UNLOCK_EMAIL || email, code, env);
  app.use(authRouter(pool, { sendCode }));
  app.use(schedulesRouter(pool));
  app.use(todosRouter(pool));
  app.use(memosRouter(pool));
  app.use(automationRouter(pool));
  app.use(pushRouter(pool, env));
  app.use(express.static('public'));
  return app;
}

function startCron(pool) {
  cron.schedule('* * * * *', () => runReminders(pool).catch(console.error));
  cron.schedule('0 0 * * *', () => {
    const today = new Date().toISOString().slice(0, 10);
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    carryoverTodos(pool, y, today).catch(console.error);
    spawnRepeats(pool, y, today, new Date().getDay()).catch(console.error);
  });
}

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1].replace(/\\\\/g,'/')}`) {
  const pool = createPool(process.env.DATABASE_URL);
  const app = await createApp(pool);
  startCron(pool);
  const port = process.env.PORT || 5173;
  app.listen(port, () => console.log(`HYOJIN app on :${port}`));
}
```

- [ ] **Step 2: 통합테스트 작성 (test/api.integration.test.js)**

```javascript
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
```

Note: connect-pg-simple가 pg-mem에서 세션테이블 생성에 실패하면, 테스트 환경에선 `store` 없이 메모리 세션을 쓰도록 `createApp`에 `env.NODE_ENV==='test'` 분기를 넣어 `new PgStore` 대신 기본 MemoryStore 사용. (분기 추가하여 통과시킬 것)

- [ ] **Step 3: 실행해서 통과 확인 (필요시 test 분기 추가)**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add src/server.js test/api.integration.test.js
git commit -m "feat: assemble express app and cron, add integration test"
```

---

## Task 8: 프론트 - 로그인 화면

**Files:**
- Create: `public/login.html`, `public/css/app.css`, `public/js/api.js`

디자인: 노랑 배경 #f6e01e, 검정 텍스트, Anton 제목. 로그인 실패 시 남은 시도, 잠금 시 코드 입력 폼 노출.

- [ ] **Step 1: public/css/app.css 작성 (HYOJIN 공통 테마)**

```css
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@600;800&display=swap');
*{box-sizing:border-box} html,body{margin:0}
body{font-family:'Archivo',system-ui,sans-serif;background:#f6e01e;color:#111}
.display{font-family:'Anton',sans-serif;letter-spacing:.02em}
.panel{background:#111;color:#f6e01e;border-radius:14px;padding:20px}
button{font-weight:800;cursor:pointer;border:none;border-radius:10px;padding:12px 16px}
.btn-red{background:#e63329;color:#fff}
input{width:100%;padding:12px;border-radius:10px;border:2px solid #111;font-size:16px}
nav a{color:#111;font-weight:800;text-decoration:none;margin-right:20px}
nav a.active{text-decoration:underline;text-underline-offset:3px}
/* 모바일 세로 우선 */
.wrap{max-width:520px;margin:0 auto;padding:16px}
```

- [ ] **Step 2: public/js/api.js 작성**

```javascript
export async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin', ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw Object.assign(new Error('http'), { status: res.status, data: await res.json().catch(() => ({})) });
  return res.json();
}
```

- [ ] **Step 3: public/login.html 작성**

```html
<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HYOJIN 로그인</title><link rel="stylesheet" href="/css/app.css">
</head><body>
<div class="wrap">
  <h1 class="display" style="font-size:44px;margin:24px 0">HYOJIN</h1>
  <div class="panel">
    <div id="loginForm">
      <input id="username" placeholder="아이디" autocomplete="username"><br><br>
      <input id="password" type="password" placeholder="비밀번호" autocomplete="current-password"><br><br>
      <button class="btn-red" id="loginBtn" style="width:100%">로그인</button>
      <p id="msg" style="color:#f6e01e"></p>
    </div>
    <div id="unlockForm" style="display:none">
      <p>계정이 잠겼습니다. 메일로 받은 6자리 코드를 입력하세요.</p>
      <input id="code" placeholder="해제 코드"><br><br>
      <button class="btn-red" id="unlockBtn" style="width:100%">잠금 해제</button>
      <p id="umsg" style="color:#f6e01e"></p>
    </div>
  </div>
</div>
<script type="module">
import { fetchJSON } from '/js/api.js';
const $ = id => document.getElementById(id);
$('loginBtn').onclick = async () => {
  try {
    await fetchJSON('/api/login', { method:'POST', body:{ username:$('username').value, password:$('password').value }});
    location.href = '/';
  } catch (e) {
    if (e.status === 423) { $('loginForm').style.display='none'; $('unlockForm').style.display='block'; }
    else if (e.data?.attempts) $('msg').textContent = `비밀번호 오류 (${e.data.attempts}/5)`;
    else $('msg').textContent = '로그인 실패';
  }
};
$('unlockBtn').onclick = async () => {
  try { await fetchJSON('/api/unlock', { method:'POST', body:{ username:$('username').value, code:$('code').value }});
    $('unlockForm').style.display='none'; $('loginForm').style.display='block'; $('msg').textContent='잠금 해제됨. 다시 로그인하세요.';
  } catch { $('umsg').textContent = '코드가 올바르지 않거나 만료됨'; }
};
</script>
</body></html>
```

- [ ] **Step 4: 수동 확인 + 커밋**

Run: `cd "/c/Users/user/Desktop/AI/hyojin-app" && node src/server.js` 후 브라우저에서 `http://127.0.0.1:5173/login.html` 열어 렌더 확인 (DB 없으면 로그인 동작은 배포 후 검증).

```bash
git add public/login.html public/css/app.css public/js/api.js
git commit -m "feat: login screen (HYOJIN theme)"
```

---

## Task 9: 프론트 - 앱 셸 + 캘린더 뷰

**Files:**
- Create: `public/index.html`, `public/js/app.js`, `public/js/calendar.js`

- [ ] **Step 1: public/index.html 작성 (셸 + 네비 + 뷰 컨테이너)**

```html
<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HYOJIN</title><link rel="stylesheet" href="/css/app.css">
<link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#f6e01e">
</head><body>
<header class="wrap" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
  <span class="display" style="font-size:24px">HYOJIN</span>
  <nav>
    <a href="#calendar">CALENDAR</a><a href="#schedule">SCHEDULE</a>
    <a href="#todo">TO-DO</a><a href="#automation">Automation</a>
  </nav>
  <a href="#" id="logout" style="margin-left:auto;font-weight:800;color:#111">LOGOUT</a>
</header>
<main id="view" class="wrap"></main>
<script type="module" src="/js/app.js"></script>
</body></html>
```

- [ ] **Step 2: public/js/app.js 작성 (해시 라우팅 + 인증가드)**

```javascript
import { fetchJSON } from '/js/api.js';
import { renderCalendar } from '/js/calendar.js';
import { renderSchedule } from '/js/schedule.js';
import { renderTodo } from '/js/todo.js';
import { renderAutomation } from '/js/automation.js';

const view = document.getElementById('view');
const routes = { calendar: renderCalendar, schedule: renderSchedule, todo: renderTodo, automation: renderAutomation };

async function guard() {
  const me = await fetchJSON('/api/me').catch(() => ({ authed: false }));
  if (!me.authed) { location.href = '/login.html'; return false; }
  return true;
}
function setActive(name){ document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.hash === '#'+name)); }
async function route() {
  const [name, param] = location.hash.slice(1).split('/');
  const fn = routes[name] || renderCalendar;
  setActive(name || 'calendar');
  view.innerHTML = '';
  await fn(view, param);
}
document.getElementById('logout').onclick = async (e) => { e.preventDefault(); await fetchJSON('/api/logout',{method:'POST'}); location.href='/login.html'; };
window.addEventListener('hashchange', route);
if (await guard()) { if (!location.hash) location.hash = '#calendar'; route(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
```

- [ ] **Step 3: public/js/calendar.js 작성**

```javascript
import { fetchJSON } from '/js/api.js';
const WD = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
let cur = new Date();

export async function renderCalendar(view) {
  const y = cur.getFullYear(), m = cur.getMonth();
  const month = `${y}-${String(m+1).padStart(2,'0')}`;
  const dates = await fetchJSON(`/api/schedules/month?month=${month}`).catch(()=>[]);
  const hasSched = new Set(dates.map(d => String(d).slice(0,10)));
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m+1, 0).getDate();
  const today = new Date().toISOString().slice(0,10);
  let cells = '';
  for (let i=0;i<first;i++) cells += '<div></div>';
  for (let d=1; d<=days; d++) {
    const ds = `${month}-${String(d).padStart(2,'0')}`;
    const isToday = ds === today;
    cells += `<a href="#schedule/${ds}" style="text-decoration:none">
      <div class="panel" style="min-height:64px;${isToday?'background:#e63329;color:#fff':''}">
        <b>${d}</b>${hasSched.has(ds)?' <span style="color:#f6e01e">•</span>':''}
      </div></a>`;
  }
  view.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin:12px 0">
      <button id="prev">◀</button><h2 class="display" style="margin:0">${y}. ${String(m+1).padStart(2,'0')}</h2><button id="next">▶</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;font-weight:800;text-align:center">
      ${WD.map(w=>`<div>${w}</div>`).join('')}${cells}
    </div>`;
  document.getElementById('prev').onclick = () => { cur = new Date(y, m-1, 1); renderCalendar(view); };
  document.getElementById('next').onclick = () => { cur = new Date(y, m+1, 1); renderCalendar(view); };
}
```

- [ ] **Step 4: 커밋** (schedule/todo/automation은 다음 태스크에서 생성, 임시 stub 없이 진행하면 import 에러 → Task 10~12 완료 후 통합 확인)

```bash
git add public/index.html public/js/app.js public/js/calendar.js
git commit -m "feat: app shell, hash routing, calendar view"
```

---

## Task 10: 프론트 - 스케줄 뷰

**Files:**
- Create: `public/js/schedule.js`

- [ ] **Step 1: public/js/schedule.js 작성**

```javascript
import { fetchJSON } from '/js/api.js';

export async function renderSchedule(view, param) {
  let date = param || new Date().toISOString().slice(0,10);
  async function load() {
    const items = await fetchJSON(`/api/schedules?date=${date}`).catch(()=>[]);
    const memo = await fetchJSON(`/api/memos?date=${date}`).catch(()=>({content:''}));
    view.innerHTML = `
      <a href="#calendar" style="font-weight:800;color:#111">‹ CALENDAR</a>
      <div style="display:flex;align-items:center;gap:10px;margin:10px 0">
        <button id="prev">◀</button><h2 class="display" style="margin:0">${date}</h2><button id="next">▶</button>
      </div>
      <div class="panel">
        <h3>SCHEDULE</h3>
        <div id="list"></div>
        <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
          <input id="t" type="time" style="width:auto" value="09:00">
          <input id="c" placeholder="일정을 입력하세요" style="flex:1">
          <label style="color:#f6e01e"><input type="checkbox" id="rm" style="width:auto"> 리마인더</label>
          <select id="rp" style="width:auto"><option value="none">반복없음</option><option value="daily">매일</option><option value="weekly">매주</option></select>
          <button class="btn-red" id="add">+ 추가</button>
        </div>
      </div>
      <div class="panel" style="margin-top:12px">
        <h3>MEMO</h3>
        <textarea id="memo" rows="5" style="width:100%">${memo.content}</textarea>
      </div>`;
    const list = document.getElementById('list');
    list.innerHTML = items.map(s => `<div style="display:flex;gap:8px;align-items:center;margin:6px 0">
      <b>${s.time}</b><span style="flex:1">${s.content}</span>
      ${s.remind?'🔔':''}${s.repeat!=='none'?'🔁':''}
      <button data-del="${s.id}">✕</button></div>`).join('') || '<p>일정 없음</p>';
    list.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      await fetchJSON(`/api/schedules/${b.dataset.del}`, { method:'DELETE' }); load();
    });
    document.getElementById('add').onclick = async () => {
      const body = { date, time:document.getElementById('t').value, content:document.getElementById('c').value,
        remind:document.getElementById('rm').checked, repeat:document.getElementById('rp').value };
      if (!body.content) return;
      await fetchJSON('/api/schedules', { method:'POST', body }); load();
    };
    let mt; document.getElementById('memo').oninput = (e) => {
      clearTimeout(mt); mt = setTimeout(() => fetchJSON('/api/memos', { method:'PUT', body:{ date, content:e.target.value }}), 500);
    };
    document.getElementById('prev').onclick = () => { date = shift(date,-1); location.hash = `#schedule/${date}`; load(); };
    document.getElementById('next').onclick = () => { date = shift(date,1); location.hash = `#schedule/${date}`; load(); };
  }
  function shift(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); }
  await load();
}
```

- [ ] **Step 2: 커밋**

```bash
git add public/js/schedule.js
git commit -m "feat: schedule view with reminder/repeat/memo"
```

---

## Task 11: 프론트 - To-Do 뷰

**Files:**
- Create: `public/js/todo.js`

- [ ] **Step 1: public/js/todo.js 작성**

```javascript
import { fetchJSON } from '/js/api.js';

export async function renderTodo(view) {
  const date = new Date().toISOString().slice(0,10);
  async function load() {
    const items = await fetchJSON(`/api/todos?date=${date}`).catch(()=>[]);
    const remain = items.filter(t=>!t.done).length, done = items.filter(t=>t.done).length;
    view.innerHTML = `
      <h2 class="display" style="margin:12px 0">TO-DO <small style="font-size:14px">남은 일 ${remain} · 완료 ${done}</small></h2>
      <div class="panel">
        <div style="display:flex;gap:6px">
          <input id="c" placeholder="+ 새 할 일 입력 후 Enter" style="flex:1">
          <button class="btn-red" id="add">ADD</button>
        </div>
        <div id="list" style="margin-top:10px"></div>
      </div>`;
    document.getElementById('list').innerHTML = items.map(t => `
      <div style="display:flex;gap:8px;align-items:center;margin:6px 0">
        <input type="checkbox" data-tog="${t.id}" ${t.done?'checked':''} style="width:auto">
        <span style="flex:1;${t.done?'text-decoration:line-through;opacity:.6':''}">${t.content}</span>
        <button data-del="${t.id}">✕</button></div>`).join('');
    document.querySelectorAll('[data-tog]').forEach(b => b.onchange = async () => {
      await fetchJSON(`/api/todos/${b.dataset.tog}`, { method:'PATCH', body:{ done:b.checked }}); load();
    });
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      await fetchJSON(`/api/todos/${b.dataset.del}`, { method:'DELETE' }); load();
    });
    const add = async () => { const c=document.getElementById('c'); if(!c.value)return;
      await fetchJSON('/api/todos', { method:'POST', body:{ date, content:c.value }}); load(); };
    document.getElementById('add').onclick = add;
    document.getElementById('c').addEventListener('keydown', e => { if(e.key==='Enter') add(); });
  }
  await load();
}
```

- [ ] **Step 2: 커밋**

```bash
git add public/js/todo.js
git commit -m "feat: todo view with autosave"
```

---

## Task 12: 프론트 - 자동화 뷰 + 푸시 구독

**Files:**
- Create: `public/js/automation.js`

- [ ] **Step 1: public/js/automation.js 작성**

```javascript
import { fetchJSON } from '/js/api.js';

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b = (base64 + pad).replace(/-/g,'+').replace(/_/g,'/');
  const raw = atob(b); return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
async function subscribePush() {
  if (!('serviceWorker' in navigator)) return;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  const { key } = await fetchJSON('/api/push/key');
  if (!key) return;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array(key) });
  await fetchJSON('/api/push/subscribe', { method:'POST', body: sub });
}

const ITEMS = [
  { key:'reminder', label:'일정 리마인더', desc:'일정 시작 30분 전 아이폰 푸시 알림' },
  { key:'carryover', label:'할 일 이월', desc:'못 끝낸 To-Do를 다음 날로 자동 이월' },
  { key:'repeat', label:'반복 일정', desc:'반복 설정한 일정을 자동으로 다음 날짜에 생성' },
];

export async function renderAutomation(view) {
  const s = await fetchJSON('/api/automation').catch(()=>({reminder:true,carryover:true,repeat:true}));
  view.innerHTML = `<h2 class="display" style="margin:12px 0">AUTOMATION</h2>
    <p>내 자동화 기능 모음 · 켜고 끄면 저장돼요.</p>
    ${ITEMS.map(it => `<div class="panel" style="margin:8px 0;display:flex;justify-content:space-between;align-items:center">
      <div><b>${it.label}</b><br><small>${it.desc}</small></div>
      <label class="switch"><input type="checkbox" data-k="${it.key}" ${s[it.key]?'checked':''} style="width:auto"></label>
    </div>`).join('')}`;
  view.querySelectorAll('[data-k]').forEach(cb => cb.onchange = async () => {
    const next = { ...s }; next[cb.dataset.k] = cb.checked; Object.assign(s, next);
    await fetchJSON('/api/automation', { method:'PUT', body: s });
    if (cb.dataset.k === 'reminder' && cb.checked) await subscribePush();
  });
}
```

- [ ] **Step 2: 커밋**

```bash
git add public/js/automation.js
git commit -m "feat: automation view with push subscribe"
```

---

## Task 13: PWA - manifest + service worker + 아이콘

**Files:**
- Create: `public/manifest.json`, `public/service-worker.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [ ] **Step 1: public/manifest.json 작성**

```json
{
  "name": "HYOJIN", "short_name": "HYOJIN",
  "start_url": "/", "display": "standalone", "orientation": "portrait",
  "background_color": "#f6e01e", "theme_color": "#f6e01e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: public/service-worker.js 작성**

```javascript
const CACHE = 'hyojin-v1';
const SHELL = ['/', '/index.html', '/login.html', '/css/app.css', '/js/api.js', '/js/app.js',
  '/js/calendar.js', '/js/schedule.js', '/js/todo.js', '/js/automation.js', '/manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.pathname.startsWith('/api/')) return; // API는 항상 네트워크
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title:'HYOJIN', body:'' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon:'/icons/icon-192.png' }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow('/')); });
```

- [ ] **Step 3: 아이콘 생성**

핸드오프의 `assets/dubu.png` 또는 노랑 바탕 검정 "H" 아이콘을 192/512로 생성해 `public/icons/`에 저장. (이미지 편집 도구 또는 간단한 캔버스 스크립트 사용. 임시로 단색 노랑+검정 H PNG 허용.)

- [ ] **Step 4: 커밋**

```bash
git add public/manifest.json public/service-worker.js public/icons
git commit -m "feat: PWA manifest, service worker, icons"
```

---

## Task 14: 배포 설정 + VAPID 키 + README

**Files:**
- Create: `render.yaml`, `README.md`, `src/seed.js`

- [ ] **Step 1: src/seed.js 작성 (초기 사용자 생성 스크립트)**

```javascript
import bcrypt from 'bcryptjs';
import { createPool, migrate } from './db.js';

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
```

- [ ] **Step 2: VAPID 키 생성**

Run: `cd "/c/Users/user/Desktop/AI/hyojin-app" && npx web-push generate-vapid-keys`
결과의 Public/Private Key를 Render 환경변수 VAPID_PUBLIC/VAPID_PRIVATE에 넣는다.

- [ ] **Step 3: render.yaml 작성**

```yaml
services:
  - type: web
    name: hyojin-app
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: node src/server.js
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SESSION_SECRET
        generateValue: true
      - key: VAPID_PUBLIC
        sync: false
      - key: VAPID_PRIVATE
        sync: false
      - key: VAPID_SUBJECT
        sync: false
      - key: SMTP_HOST
        sync: false
      - key: SMTP_PORT
        sync: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: UNLOCK_EMAIL
        sync: false
      - key: NODE_ENV
        value: production
```

- [ ] **Step 4: README.md 작성 (배포 절차)**

````markdown
# HYOJIN 개인 일정·기록 앱

## 로컬 실행
1. `.env` 작성 (`.env.example` 참고, Neon Postgres URL 필요)
2. `npm install`
3. `node src/seed.js <아이디> <비번> <메일>` — 로그인 계정 생성
4. `npm start` → http://127.0.0.1:5173/login.html

## 배포 (Render + Neon)
1. Neon(neon.tech)에서 무료 Postgres 생성 → DATABASE_URL 복사
2. 이 레포를 GitHub에 push
3. Render에서 New → Blueprint → 레포 선택 (render.yaml 자동 인식)
4. 환경변수 입력: DATABASE_URL, VAPID_*, SMTP_* , UNLOCK_EMAIL
5. 배포 후 Render Shell에서 `node src/seed.js ...`로 계정 생성
6. 아이폰 사파리로 접속 → 공유 → "홈 화면에 추가" → 자동화 탭에서 리마인더 켜 푸시 허용

## 테스트
`npm test`
````

- [ ] **Step 5: 커밋**

```bash
git add render.yaml README.md src/seed.js
git commit -m "chore: deploy config, seed script, README"
```

---

## Task 15: GitHub 업로드 + 전체 검증

- [ ] **Step 1: 전체 테스트 통과 확인**

Run: `cd "/c/Users/user/Desktop/AI/hyojin-app" && npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: GitHub 레포 생성 및 push**

```bash
cd "/c/Users/user/Desktop/AI/hyojin-app"
gh repo create hyojin-app --private --source=. --remote=origin --push
```
(gh 미인증 시 `gh auth login` 먼저. 사용자 확인 후 진행.)

- [ ] **Step 3: 배포 값 사용자에게 요청**

사용자에게 받는다: 로그인 아이디/비번, 잠금해제 수신 이메일, SMTP 계정(예: Gmail 앱 비밀번호). Neon DATABASE_URL 생성 안내.

- [ ] **Step 4: 최종 커밋(있으면) 및 완료 보고**

```bash
git add -A && git commit -m "chore: finalize" || true
git push
```

---

## Self-Review 결과

- **스펙 커버리지:** 로그인/잠금/해제코드(Task3,8), 캘린더(Task9), 스케줄+메모(Task10), To-Do(Task11), 자동화 3토글(Task12), 리마인더·이월·반복 cron(Task6,7), PWA 푸시(Task12,13), Neon+Render 배포(Task14), GitHub 업로드(Task1,15), 문서도 레포 포함(Task1). 모든 스펙 항목에 태스크 존재.
- **플레이스홀더:** 각 스텝에 실제 코드/명령 포함. 아이콘 생성(Task13-3)만 자산 선택 여지 있음 — 단색 대체 허용 명시.
- **타입 일관성:** `fetchJSON`, `requireAuth`, `sendPush`, `attemptLogin/verifyUnlock`, 라우트 경로(/api/*), automation 키(reminder/carryover/repeat)가 프론트·백엔드·jobs·테스트에서 동일하게 사용됨. schedules `reminded` 컬럼이 스키마(Task2)와 jobs(Task6)에서 일치.
- **주의점(실행 중 처리):** connect-pg-simple가 pg-mem에서 세션 테이블을 못 만들 수 있어 Task7에서 test 환경 MemoryStore 분기 필요. cron은 UTC 기준이므로 Render 타임존(TZ=Asia/Seoul) 환경변수 추가 권장 — 배포 시 Render 환경변수에 `TZ=Asia/Seoul` 추가.
