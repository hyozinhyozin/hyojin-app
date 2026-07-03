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
