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
