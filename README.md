# HYOJIN 개인 일정·기록 앱

아이폰용 개인 일정·기록 PWA. 캘린더 · 스케줄(+메모) · To-Do · 자동화(리마인더/이월/반복) + 로그인.
HYOJIN 테마(노랑 `#f6e01e` / 검정 `#111`, 폰트 Anton·Archivo).

## 로컬 실행
1. `.env` 작성 (`.env.example` 참고, Neon Postgres URL 필요)
2. `npm install`
3. `node src/seed.js <아이디> <비번> <메일>` — 로그인 계정 생성
4. `npm start` → http://127.0.0.1:5173/login.html

## 배포 (Render + Neon)
1. Neon(neon.tech)에서 무료 Postgres 생성 → `DATABASE_URL` 복사
2. VAPID 키 생성: `npx web-push generate-vapid-keys` → Public/Private 키 확보
3. 이 레포를 GitHub에 push
4. Render에서 New → Blueprint → 레포 선택 (`render.yaml` 자동 인식)
5. 환경변수 입력: `DATABASE_URL`, `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT`(mailto:), `SMTP_*`, `UNLOCK_EMAIL`
   - `TZ=Asia/Seoul`은 render.yaml에 이미 포함 (cron이 한국 시간 기준으로 동작)
6. 배포 후 Render Shell에서 `node src/seed.js <아이디> <비번> <메일>`로 계정 생성
7. 아이폰 사파리로 접속 → 공유 → "홈 화면에 추가" → 자동화 탭에서 리마인더 켜 푸시 허용

## 기술 스택
Node.js(Express) · Postgres(`pg`) · express-session + connect-pg-simple · bcryptjs ·
web-push · nodemailer · node-cron. 프론트는 vanilla JS + Service Worker(PWA).
테스트는 `node:test` + supertest + pg-mem.

## 테스트
`npm test`
