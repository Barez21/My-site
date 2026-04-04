@echo off
setlocal disabledelayedexpansion
title WikiScraper v6

echo.
echo  ================================================
echo   WikiScraper v6
echo  ================================================
echo.

cd /d "%~dp0"
echo  Slozka: %cd%
echo.

if not exist "wiki_gui.py" (
    echo  CHYBA: wiki_gui.py nenalezen v teto slozce.
    echo  Presun .bat soubor do stejne slozky jako wiki_gui.py
    echo.
    pause
    exit /b 1
)

python --version >nul 2>&1
if errorlevel 1 (
    echo  CHYBA: Python nenalezen.
    echo  Nainstaluj Python z https://www.python.org
    echo  Pri instalaci zaskrtni "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version 2^>^&1') do echo  Python: %%i
echo.

if exist "venv\Scripts\activate.bat" (
    echo  Aktivuji virtualni prostredi...
    call venv\Scripts\activate.bat
    goto :run
)

echo  Virtualni prostredi nenalezeno.
echo  Chces vytvorit venv a nainstalovat zavislosti?
echo.
choice /c AN /m "  [A] Ano   [N] Ne"
if errorlevel 2 goto :skipvenv

echo.
echo  Vytvarim venv...
python -m venv venv
if errorlevel 1 (
    echo  CHYBA: Vytvoreni venv selhalo.
    pause
    exit /b 1
)
call venv\Scripts\activate.bat

:skipvenv
echo  Instaluji zavislosti...
pip install requests beautifulsoup4 flask openpyxl --quiet
if errorlevel 1 (
    echo  CHYBA: pip install selhal.
    echo  Zkus rucne: pip install requests beautifulsoup4 flask openpyxl
    pause
    exit /b 1
)
echo  Zavislosti OK.

:run
echo.
echo  Spoustim http://localhost:7842
echo  Ukonceni: Ctrl+C
echo.

start "" /b cmd /c "timeout /t 2 >nul && start http://localhost:7842"

python wiki_gui.py

echo.
echo  Server ukoncen.
pause
