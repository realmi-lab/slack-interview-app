# 작업 기준

README.md를 먼저 읽는다. frontend/blocks.mjs는 Slack 화면, backend/는 이벤트·설정·업무 규칙·SQLite다. 단순 함수와 직접 import를 유지하고 범용 프레임워크나 동적 라우팅을 추가하지 않는다.

- 실행: `npm start`; 설정: 루트 `.env`; 검사: `npm run doctor`.
- 변경 후 `npm test` 한 번. 실패나 추가 변경 없이 같은 검사를 반복하지 않는다. OS별 행렬·화면 문구 고정 테스트를 늘리지 않는다.
- 확정은 담당자 권한·후보 범위·최신 투표를 확인한 뒤 저장한다. .env·DB·키체인 비밀값은 커밋하지 않는다.
- 실제 Slack 메시지 테스트는 테스트 워크스페이스 사용을 명시적으로 승인받았을 때만 한다.
- 게시까지 요청된 변경은 main에 올리고 상태를 확인한다.

Slack 공통 설정은 docs/SLACK_SETUP.md를 따른다. 공통 키는 SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_NOTIFY_CHANNEL, APP_TIMEZONE, SQLITE_PATH다. 설정은 backend/config, Slack 접속은 backend/slack에서 수정한다. 새 기능 때문에 공통 설정 이름을 다르게 만들지 않는다.

README는 code_management의 소개 → 주요 기능 → 아키텍처 → 기술 스택 → 처음 실행하기 → 프로젝트 구조 → 검증 구성을 따른다. 초보자에게 도구 이름보다 역할을 설명한다. 상세 사용법은 docs/USAGE.md, 검증 근거는 docs/TEST_REPORT.md, 문서 목차는 docs/README.md에 둔다. 문서만 바꿀 때는 링크·경로·diff를 확인하고 전체 기능 검사를 반복하지 않는다.
