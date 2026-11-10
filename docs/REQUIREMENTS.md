# 설치 요구사항

[README](../README.md) · [문서 목차](README.md)

이 저장소는 소스와 의존성 명세를 제공합니다. 미리 빌드한 앱·실행 파일은 설치에 필요하지 않습니다.

## 프로그램과 파일

| 항목 | 조건·역할 |
|---|---|
| Node.js | 22.13 이상. CI는 24 사용. SQLite와 .env 로더 포함 |
| npm | 9.6.4 이상. 잠금 파일 기준 의존성 설치 |
| Git | 소스 받기·업데이트 |
| 로컬 저장소 | SQLite 파일을 쓸 수 있는 디스크. 별도 DB 서버는 불필요 |
| 네트워크 | 실행 PC에서 Slack HTTPS·WebSocket 연결 허용 |

## 의존성 명세

- [package.json](../package.json): 실행 조건·직접 의존성·실행 명령. Slack Bolt 5.1.0 사용.
- [package-lock.json](../package-lock.json): 간접 의존성을 포함한 정확한 설치 버전과 무결성 정보.
- [.nvmrc](../.nvmrc): Node 버전 선택 도구를 사용하는 경우의 버전 기준.

```sh
npm ci
npm run doctor
npm start
```

JavaScript 앱의 설치 명세는 package.json과 package-lock.json입니다. Python용 requirements.txt는 사용하지 않습니다. 의존성을 바꾸면 두 파일을 함께 갱신합니다. 별도 프론트 빌드·Swift 컴파일은 기본 .env 설치에 필요하지 않습니다.

## Slack과 환경변수

1. Slack 앱 생성·설치 권한과 [매니페스트](../manifest.json)의 Bot Scopes·Bot Events·Interactivity 설정.
2. Socket Mode와 connections:write 앱 토큰, 설치한 앱의 봇 토큰.
3. 게시할 채널과 봇 초대, 루트 `.env`의 SLACK_NOTIFY_CHANNEL.
4. `.env`의 시간대·DB 경로와 면접 시간·후보 개수 설정.
5. 선택 기능: 기존 Mac 키체인을 쓸 때만 Xcode Command Line Tools·Swift, SLACK_TOKEN_SOURCE=keychain.

전체 환경변수는 [.env.example](../.env.example), 공통 규칙은 [Slack 설정](SLACK_SETUP.md), 생성·설치·권한은 [상세 안내](USAGE.md)를 따릅니다.
