@echo off
echo ========================================
echo   Dashboard Basculas - React + Tailwind
echo ========================================
echo.

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

REM Verificar Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python no esta instalado
    pause
    exit /b 1
)

echo [INFO] Instalando dependencias...
echo.

REM Instalar dependencias del frontend
echo [1/2] Frontend (npm)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo la instalacion del frontend
    pause
    exit /b 1
)

REM Instalar dependencias del backend
echo [2/2] Backend (pip)...
cd backend
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo la instalacion del backend
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   Instalacion completada!
echo ========================================
echo.
echo Para ejecutar el proyecto:
echo.
echo   Terminal 1: cd backend ^&^& python api.py
echo   Terminal 2: npm run dev
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8050
echo.
pause
