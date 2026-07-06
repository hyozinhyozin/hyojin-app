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
  await migrate(pool, env.DB_SCHEMA);
  configurePush(env);
  const mailer = makeMailer(env);
  const app = express();
  app.use(express.json());
  // 테스트 환경(pg-mem)에서는 connect-pg-simple가 세션 테이블을 못 만들므로 기본 MemoryStore 사용.
  const sessionOpts = {
    secret: env.SESSION_SECRET || 'dev-secret',
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, secure: env.NODE_ENV === 'production', maxAge: 30 * 24 * 3600 * 1000 },
  };
  if (env.NODE_ENV !== 'test') {
    const PgStore = connectPg(session);
    sessionOpts.store = new PgStore({ pool, createTableIfMissing: true, schemaName: env.DB_SCHEMA });
  }
  app.use(session(sessionOpts));
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

const invokedPath = process.argv[1] ? process.argv[1].replace(/\\/g, '/') : '';
if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${invokedPath}`) {
  // 로컬 개발용 .env 자동 로드(있을 때만). Render 등 배포 환경은 .env가 없어 조용히 건너뜀.
  try { process.loadEnvFile?.(); } catch { /* .env 없음 — 무시 */ }
  const pool = createPool(process.env.DATABASE_URL, process.env.DB_SCHEMA);
  const app = await createApp(pool);
  startCron(pool);
  const port = process.env.PORT || 5173;
  app.listen(port, () => console.log(`HYOJIN app on :${port}`));
}
