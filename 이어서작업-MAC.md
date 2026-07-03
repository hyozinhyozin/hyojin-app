# HYOJIN 앱 — Mac 이어서 작업 안내

이 zip은 2026-07-03 16:xx 시점 스냅샷입니다. Windows PC에서 여기까지 만들고 Mac으로 옮겨 이어서 작업합니다.

## 지금 상태 (백엔드 절반 완료, 테스트 7개 통과)

완료된 Task (git 커밋 히스토리에 남아있음, `git log --oneline`):
- Task 1: 프로젝트 스캐폴드 + git init
- Task 2: DB 스키마 + pg-mem 테스트 하네스 (`src/db.js`, `test/helpers.js`)
- Task 3: 인증 - 로그인/5회잠금/메일 해제코드 (`src/auth.js`, `src/mailer.js`)
- Task 4: 데이터 API - schedules/todos/memos/automation (`src/*.js`)
- Task 5: Web Push 모듈 (`src/push.js`)

남은 Task (플랜 문서 `docs/superpowers/plans/2026-07-03-hyojin-schedule-app.md` 참고):
- Task 6: cron 로직 (리마인더/할일이월/반복) `src/jobs.js` + 테스트
- Task 7: 서버 조립 `src/server.js` + 통합테스트
- Task 8~12: 프론트 (로그인/캘린더/스케줄/투두/자동화) `public/`
- Task 13: PWA (manifest/service-worker/아이콘)
- Task 14: 배포 설정 (render.yaml/seed.js/README)
- Task 15: GitHub(private) 업로드 + 배포

## Mac에서 시작하는 법

```bash
cd hyojin-app
npm install          # node_modules는 zip에 없음 (재설치 필요)
npm test             # 7개 통과 확인
```

## 중요 메모
- **bcrypt 대신 bcryptjs 사용.** Windows 회사망 TLS 가로채기 때문에 bcrypt 네이티브 빌드가 막혀서 순수 JS인 bcryptjs로 교체함. Mac에서는 bcrypt도 되지만 그대로 bcryptjs 유지 권장 (코드/플랜 이미 반영됨).
- Node 20+ 필요 (개발은 Node 24에서 함).
- DB는 Neon 무료 Postgres 예정. 아직 미연결 — `.env`에 DATABASE_URL 넣어야 서버 구동됨 (`.env.example` 참고).
- 설계 원본은 `../디자인/` 폴더 참고 (핸드오프 zip들). HYOJIN 테마 = 노랑 #f6e01e / 검정 #111, 폰트 Anton·Archivo.
- 실행 방식은 Subagent-Driven(플랜 Task별 구현→리뷰). Claude Code에서 플랜 파일 열고 이어서 진행하면 됨.
