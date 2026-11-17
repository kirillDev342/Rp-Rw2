@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Для сетевой игры нужен Node.js 18 или новее.
  echo Установите Node.js с https://nodejs.org/ и запустите файл снова.
  pause
  exit /b 1
)
if not exist "node_modules\ws\package.json" (
  echo Первый запуск: устанавливаем WebSocket-сервер...
  call npm install --omit=dev
  if errorlevel 1 (
    echo Не удалось установить зависимости.
    pause
    exit /b 1
  )
)
start "Soul Knight Co-op Server" /min node server.js
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:4173
endlocal
