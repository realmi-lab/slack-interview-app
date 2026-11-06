# 면접 일정 Slack 앱

면접관이 번호 이모지로 가능한 시간을 고르면 공통 시간을 보여 주는 Slack 앱입니다. macOS에서 Socket Mode로 실행하며 공개 웹 주소나 도메인이 필요 없습니다.

## 사용 흐름

1. **조율 시작:** 채널에서 `/interview` 입력(또는 앱 홈의 **새 일정 조율**). 면접관을 고르고 후보 시간을 확인한 뒤 **보내기**.
   - 후보는 다음 주 월~금 10:00–18:00, 1시간 단위입니다. 점심(12:30–14:00)과 이미 확정된 면접 시간은 뺍니다.
   - 봇이 한 주에 고르게 6개를 미리 골라 둡니다. 최대 10개까지 바꿀 수 있습니다.
2. **면접관 응답:** 봇이 그 채널에 면접관을 멘션한 조율 메시지를 올리고 1️⃣~🔟 이모지를 미리 달아 둡니다. 면접관은 가능한 시간의 이모지를 누르기만 하면 됩니다.
3. **결과:** 이모지를 누르거나 뺄 때마다 메시지가 바뀝니다. 후보마다 누른 사람과 **모두 가능**한 시간이 보이고, 면접관이 모두 응답하면 요청한 사람에게 스레드로 알립니다.
4. **확정:** 요청한 사람이 **확정**을 누르면 스레드로 면접관에게 알립니다. **확정 취소**도 됩니다. 확정된 시간은 다음 조율 추천에서 빠집니다.

앱 홈에서 시작하면 `config.json`의 `notificationChannelId` 채널(#인터뷰일정)에 올라갑니다. 다른 채널에서 쓰려면 봇을 먼저 초대하세요(`/invite @interview-scheduler`).

## 구조

| 파일 | 역할 |
| --- | --- |
| `core.mjs` | 후보 시간 계산, 고르게 추천, 이모지 반응 집계 (순수 함수) |
| `store.mjs` | SQLite에 조율 메시지별 면접관·후보·확정 상태 저장 |
| `blocks.mjs` | 앱 홈, 조율 시작 창, 조율 메시지 화면 |
| `interview-bot.mjs` | 실행 진입점: Slack 연결, 명령·버튼·이모지 반응 처리 |

누가 어떤 후보를 눌렀는지는 저장하지 않습니다. 반응이 올 때마다 Slack에서 그 메시지의 이모지 반응을 다시 읽어 계산합니다.

## 설정 (`config.json`)

| 키 | 뜻 | 예 |
| --- | --- | --- |
| `notificationChannelId` | 앱 홈에서 시작할 때 올릴 채널 | `채널 ID` |
| `startHour`, `endHour` | 후보 시간 범위(시) | `10`, `18` |
| `interviewMinutes` | 면접 길이(분) | `60` |
| `optionCount` | 봇이 미리 고르는 후보 수(최대 10) | `6` |

## 설치·연결

1. Slack 앱 관리에서 `manifest.json`으로 앱을 생성합니다.
2. 워크스페이스에 설치한 뒤 봇 토큰을 준비합니다. Socket Mode용 앱 토큰에는 `connections:write` 권한을 부여합니다.
3. `config.example.json`을 `config.json`으로 복사하고 `notificationChannelId`에 사용할 채널 ID를 넣습니다. 그 채널에 봇을 초대합니다.
4. 키체인 저장 도구를 빌드하고 로컬 입력 화면을 실행합니다.

   ```sh
   xcrun swiftc tools/keychain-save.swift -o tools/keychain-save
   node tools/keychain-setup.mjs
   ```

   터미널에 표시된 `http://127.0.0.1:.../setup/...` 주소를 이 Mac의 브라우저에서 열어 봇 토큰과 앱 토큰을 입력합니다. 주소는 한 번 저장하거나 10분이 지나면 닫힙니다. 토큰은 macOS 키체인에 저장됩니다.

공개 저장소에는 실제 `config.json`, 토큰, SQLite 데이터, 로그, 운영 상태 파일, 이전 백업을 포함하지 않습니다.

## 실행

```sh
npm ci
npm test
npm start
```

재시작은 Finder에서 `restart.command` 더블클릭. Node.js 22.13 이상. 토큰은 macOS 키체인의 `slack-interview-bot-token`, `slack-interview-app-token`에서 읽습니다.

봇 권한: `commands`, `chat:write`, `reactions:read`(이모지 반응 읽기), `reactions:write`(번호 이모지 미리 달기). 이벤트: `app_home_opened`, `reaction_added`, `reaction_removed`. 자세한 설정은 `manifest.json`.

## 나중에 아웃룩을 쓰게 되면

`interview-bot.mjs`의 `openPollModal`에서 `busy`(피할 시간)에 면접관들의 아웃룩 일정을 더하면, 추천 후보가 그 일정을 자동으로 피합니다.
