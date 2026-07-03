# HYOJIN 개인 일정·기록 앱 — 설계 문서

작성일: 2026-07-03
상태: 설계 확정 (A안 승인)

## 1. 개요

아이폰에서 쓰는 개인 일정·기록용 PWA 웹앱. GitHub에 올리고 Render에 배포해서
아이폰 홈화면에 추가해 앱처럼 사용한다. 디자인은 넘겨받은 handoff의 **HYOJIN 테마
(노랑 #f6e01e / 검정 #111, 폰트 Anton·Archivo)** 를 그대로 재현한다.

디자인 원본: `Copy of Software inquiry program design-handoff (8).zip`
→ `copy-of-software-inquiry-program-design/project/` 안의
CALENDAR / SCHEDULE / TODO / AUTOMATION / HYOJIN `.dc.html`.
(.dc.html은 디자인툴 export이지만 내부에 실제 HTML/CSS가 들어있어 재사용 가능.
support.js 런타임 껍데기는 버리고 마크업·스타일만 추출해 순수 웹으로 재구성한다.)

핸드오프에 섞여 있는 무관한 화면(어쩌다 두부, 소프트웨어 자산관리, 스팸메일 분석기,
계약구매, 넷클라이언트)은 이 앱에 포함하지 않는다.

## 2. 기술 스택 (A안)

- 프론트엔드: 순수 HTML/CSS/JS (프레임워크 없음), 모바일 세로 우선 반응형
- 백엔드: Node.js + Express (로그인, 데이터 API, 푸시, 메일, cron)
- DB: Neon 무료 Postgres (영구 보존). Render 자체 무료 DB는 30일 후 삭제되므로 미사용
- 인증: 세션 쿠키 기반 (httpOnly), 비밀번호 bcrypt 해시
- 푸시: Web Push (VAPID 키) + Service Worker
- 메일: nodemailer (SMTP) — 잠금 해제 코드 발송용
- 예약작업: 서버 프로세스 내 node-cron
- 배포: GitHub 레포 → Render 웹서비스 1개 (자동 배포)

비용: Render 무료 웹서비스 + Neon 무료 DB = 0원 시작 가능.
무료 티어는 15분 미사용 시 슬립 → 첫 접속 지연 있음(감수).

## 3. 화면 (5개)

모두 HYOJIN 노랑/검정 테마, 상단 네비: CALENDAR · SCHEDULE · TO-DO · Automation.

### 3.1 로그인
- 아이디 + 비밀번호 입력
- 5회 연속 실패 → 계정 1시간 잠금
- 잠김 상태에서: 개인 이메일로 6자리 해제 코드 발송, 코드 입력 시 즉시 잠금 해제
- 1시간 경과 시 자동 해제
- 세션 유지(로그인 후 재방문 시 자동 로그인)

### 3.2 캘린더 (CALENDAR.dc.html / cal-hy.png)
- 월 단위 그리드, 좌우 화살표로 월 이동
- 오늘 날짜 빨강 강조
- 일정이 있는 날짜에 표시점
- 날짜 클릭 → 해당 날짜 스케줄 화면으로 이동

### 3.3 스케줄 (SCHEDULE.dc.html / sch.png)
- 상단에 선택된 날짜(예: 2026.07.03 FRI), 좌우 화살표로 하루씩 이동
- 시간 + 내용 형태의 일정 항목 추가/수정/삭제
- 각 일정에 리마인더 on/off, 반복(매일/매주) 설정
- 하단 MEMO 영역 (그날의 자유 메모)
- 캘린더에서 날짜 클릭해 진입하거나 직접 진입 모두 가능

### 3.4 To-Do (TODO.dc.html / todo.png)
- 할 일 입력 후 Enter/ADD → 목록 추가
- 체크박스로 완료 처리, x로 삭제
- "남은 일 N · 완료 N" 카운트
- 자동 저장 (입력 즉시 서버 반영)

### 3.5 자동화 (AUTOMATION.dc.html / auto.png)
토글 3개만 유지 (모닝 브리핑·주간 리포트·취침 정리는 제거):
1. **일정 리마인더** — 일정 시작 30분 전 아이폰 푸시 알림
2. **할 일 이월** — 그날 완료 안 된 To-Do를 다음날로 자동 이월
3. **반복 일정** — 반복 설정된 일정을 자동으로 다음 날짜에 생성
각 토글의 on/off 상태는 서버에 저장.

## 4. 데이터 모델 (Postgres)

- `users`: id, username, password_hash, email, failed_attempts, locked_until,
  unlock_code, unlock_code_expires
- `schedules`: id, user_id, date, time, content, remind(bool),
  repeat(none|daily|weekly), repeat_parent_id
- `todos`: id, user_id, date, content, done(bool), created_at
- `memos`: id, user_id, date, content
- `push_subscriptions`: id, user_id, subscription(json), created_at
- `automation_settings`: user_id, reminder(bool), carryover(bool), repeat(bool)

## 5. 예약작업 (node-cron)

- 매 1분: `schedules` 중 리마인더 on & 시작 30분 전 도달 & 미발송 → 푸시 발송
- 매일 00:00: carryover on이면 전날 미완료 To-Do를 오늘 날짜로 이동(전날에서 제거, 중복 생성 안 함)
- 매일 00:05: repeat on이면 반복 일정의 다음 인스턴스를 생성

## 6. PWA / 배포

- `manifest.json` (앱 이름 HYOJIN, 아이콘, 세로 고정, 테마색 #f6e01e)
- `service-worker.js` (오프라인 셸 캐시 + push 이벤트 → 알림 표시)
- 아이폰 사파리에서 열어 "홈 화면에 추가" → 앱처럼 실행 + 푸시 수신 (iOS 16.4+)
- GitHub 레포 push → Render 자동 배포
- 환경변수: DATABASE_URL, SESSION_SECRET, VAPID_PUBLIC/PRIVATE, SMTP 설정,
  UNLOCK_EMAIL(수신 주소)

## 7. 배포 단계에서 사용자에게 받을 것

- 로그인 아이디/비밀번호 (초기값)
- 잠금 해제 코드를 받을 개인 이메일 주소
- 메일 발송용 SMTP 계정 (예: Gmail 앱 비밀번호) — 없으면 안내

## 8. 범위 밖 (YAGNI)

- 다중 사용자/회원가입 (단일 사용자 앱)
- 모닝 브리핑, 주간 리포트, 취침 정리 자동화
- 사진 기반 하루기록(베이지 테마) — 이번 앱 대상 아님
- 소셜 로그인, 외부 캘린더 연동
