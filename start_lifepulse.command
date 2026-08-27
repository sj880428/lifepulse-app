#!/bin/bash
# LifePulse 스마트 캘린더 자동 실행 스크립트

# 현재 스크립트 위치로 이동
cd "$(dirname "$0")"

echo "=========================================="
echo "✨ LifePulse 스마트 캘린더를 시작합니다..."
echo "=========================================="

# 기존에 3000번 포트를 사용 중인 프로세스가 있다면 정리
PID=$(lsof -ti:3000)
if [ -n "$PID" ]; then
  kill -9 $PID 2>/dev/null
fi

# Mac 현재 Wi-Fi IP 주소 확인
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

echo "💻 Mac 브라우저 접속 주소: http://localhost:3000"
echo "📱 스마트폰 접속 주소:    http://${LOCAL_IP}:3000"
echo "=========================================="
echo "💡 이 창을 닫으면 서버가 종료됩니다."
echo "=========================================="

# Mac 기본 브라우저로 1초 후 자동 열기
(sleep 1 && open "http://localhost:3000") &

# 웹 서버 실행
python3 -m http.server 3000
