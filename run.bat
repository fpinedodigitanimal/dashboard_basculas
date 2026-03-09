@echo off
echo ========================================
echo   Iniciando Dashboard Basculas
echo ========================================
echo.

REM Verificar .env
if not exist ".env" (
    echo [WARN] No existe archivo .env
    echo Copiando desde .env.example...
    copy .env.example .env
    echo.
    echo [IMPORTANTE] Edita .env con tus tokens antes de continuar
    echo.
    pause
)

echo Iniciando servicios...
echo.

REM Iniciar backend en nueva ventana
echo [1/2] Iniciando Backend API...
start "Backend API - Basculas" cmd /k "cd backend && python api.py"

REM Esperar 3 segundos
timeout /t 3 /nobreak >nul

REM Iniciar frontend en nueva ventana
echo [2/2] Iniciando Frontend React...
start "Frontend React - Basculas" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servicios iniciados!
echo ========================================
echo.
echo Backend:  http://localhost:8050
echo Frontend: http://localhost:3000
echo.
echo Presiona Ctrl+C en cada ventana para detener
echo.
pause
