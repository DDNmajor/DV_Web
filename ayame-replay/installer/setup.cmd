@echo off
rem Cai Ayame Installer - chi can chay 1 lan, khong can quyen Administrator.
rem Toan bo cong viec nam trong ayame-handler.ps1 (mo bang Notepad de xem).
if not exist "%~dp0ayame-handler.ps1" (
  echo Hay giai nen file AyameInstaller.zip truoc, roi chay setup.cmd trong thu muc vua giai nen.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ayame-handler.ps1" -Install
