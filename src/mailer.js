import nodemailer from 'nodemailer';

// 메일 전송 방식 선택:
//  1) RESEND_API_KEY 있으면 Resend(HTTPS API) — Render 무료플랜은 SMTP 포트를 막으므로 필수.
//  2) 아니면 SMTP_HOST 있을 때 nodemailer(SMTP) 폴백.
//  3) 둘 다 없으면 no-op(로그만) — 로컬 개발/테스트용.
export function makeMailer(env = process.env) {
  if (env.RESEND_API_KEY) {
    const from = env.RESEND_FROM || 'onboarding@resend.dev';
    return {
      kind: 'resend',
      async sendMail({ to, subject, text }) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            // Resend는 Cloudflare 뒤에 있어 User-Agent 없으면 403/1010.
            'User-Agent': 'hyojin-app/1.0',
          },
          body: JSON.stringify({ from, to, subject, text }),
        });
        if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => '')}`);
        return res.json();
      },
    };
  }
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 465),
      secure: Number(env.SMTP_PORT || 465) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return { kind: 'noop', sendMail: async () => {} };
}

export async function sendUnlockCode(mailer, to, code, env = process.env) {
  const from = env.RESEND_FROM || env.SMTP_USER;
  await mailer.sendMail({
    from, to,
    subject: '[HYOJIN] 잠금 해제 코드',
    text: `해제 코드: ${code} (15분 내 유효)`,
  });
}
