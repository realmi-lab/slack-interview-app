#!/bin/zsh
# 면접 일정 봇 재시작: Finder에서 더블클릭하면 실행 중인 봇을 끄고 새로 켭니다.
cd "$(dirname "$0")"
pkill -f "backend/app.mjs" 2>/dev/null   # 실행 중인 봇 종료
sleep 1
npm start
