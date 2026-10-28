# Ayame Installer — cài replay .ayame từ web vào thư mục Archive của Idol Showdown.
#
#   ayame-handler.ps1 -Install            đăng ký giao thức ayame:// (chỉ cho tài khoản Windows hiện tại)
#   ayame-handler.ps1 -Uninstall          gỡ đăng ký
#   ayame-handler.ps1 ayame://install/<id>   tải replay <id> từ server trong config.json, chép vào Archive
#   ayame-handler.ps1 ayame://open-archive   mở thư mục Archive trong File Explorer
#
# Script chỉ tải từ địa chỉ server ghi trong config.json, không bao giờ lấy địa chỉ từ đường link,
# chỉ ghi vào thư mục Archive của game và không ghi đè file có sẵn.

param(
  [Parameter(Position = 0)][string]$Uri,
  [switch]$Install,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms

$AppName = 'Ayame Installer'
$InstallDir = Join-Path $env:LOCALAPPDATA 'AyameInstaller'
$ArchiveDir = Join-Path $env:USERPROFILE 'AppData\LocalLow\BestoGameStudios\Idol Showdown\Archive'
$ProtocolKey = 'HKCU:\Software\Classes\ayame'
$ShortcutPath = Join-Path ([Environment]::GetFolderPath('Programs')) 'Idol Showdown - Replay Archive.lnk'
$MaxBytes = 40MB

function Show-Message([string]$Text, [string]$Icon = 'Information') {
  # Cửa sổ ẩn đặt TopMost để hộp thoại không bị trình duyệt che mất.
  $owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false }
  try {
    [void][System.Windows.Forms.MessageBox]::Show($owner, $Text, $AppName, 'OK', $Icon)
  } finally {
    $owner.Dispose()
  }
}

function Install-Handler {
  $source = Split-Path -Parent $PSCommandPath
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  foreach ($name in 'ayame-handler.ps1', 'config.json', 'uninstall.cmd') {
    $from = Join-Path $source $name
    if (-not (Test-Path -LiteralPath $from)) { throw "Thiếu file $name. Hãy giải nén toàn bộ file zip rồi chạy lại setup.cmd." }
    if ((Resolve-Path -LiteralPath $from).Path -ne (Join-Path $InstallDir $name)) {
      Copy-Item -LiteralPath $from -Destination $InstallDir -Force
    }
  }
  Get-ChildItem -LiteralPath $InstallDir | Unblock-File
  [void](Get-ServerUrl)

  $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $script = Join-Path $InstallDir 'ayame-handler.ps1'
  New-Item -Path $ProtocolKey -Force | Out-Null
  Set-ItemProperty -Path $ProtocolKey -Name '(default)' -Value 'URL:Ayame Replay'
  New-ItemProperty -Path $ProtocolKey -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
  $commandKey = "$ProtocolKey\shell\open\command"
  New-Item -Path $commandKey -Force | Out-Null
  Set-ItemProperty -Path $commandKey -Name '(default)' `
    -Value "`"$powershell`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" `"%1`""

  New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = Join-Path $env:SystemRoot 'explorer.exe'
  $shortcut.Arguments = "`"$ArchiveDir`""
  $shortcut.Description = 'Thư mục replay (.ayame) của Idol Showdown'
  $shortcut.Save()

  Show-Message ("Đã cài xong Ayame Installer!`n`n" +
    "• Trên web, bấm ""Cài vào game"" để đưa replay thẳng vào game.`n" +
    "• Trình duyệt có thể hỏi ""Mở Windows PowerShell?"" — hãy chọn Mở (có thể tick ""Luôn cho phép"").`n" +
    "• Thư mục replay có lối tắt trong Start Menu: ""Idol Showdown - Replay Archive"".")
}

function Uninstall-Handler {
  if (Test-Path -LiteralPath $ProtocolKey) { Remove-Item -LiteralPath $ProtocolKey -Recurse -Force }
  if (Test-Path -LiteralPath $ShortcutPath) { Remove-Item -LiteralPath $ShortcutPath -Force }
  Show-Message 'Đã gỡ Ayame Installer. Các replay đã cài vẫn còn nguyên trong game.'
  # Script có thể đang chạy từ chính thư mục cài, nên xoá thư mục sau khi script thoát.
  if (Test-Path -LiteralPath $InstallDir) {
    Start-Process -FilePath cmd.exe -WindowStyle Hidden `
      -ArgumentList '/c', "timeout /t 2 /nobreak >nul & rmdir /s /q `"$InstallDir`""
  }
}

function Get-ServerUrl {
  $configPath = Join-Path $PSScriptRoot 'config.json'
  $config = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $server = ([string]$config.server).TrimEnd('/')
  if ($server -notmatch '^https?://[^\s"''<>]+$') { throw 'config.json không có địa chỉ server hợp lệ. Hãy tải lại trình cài từ web.' }
  return $server
}

# Kiểm tra file đúng là replay: 3 string đầu của .NET BinaryWriter là giờ bắt đầu, giờ kết thúc
# và "ver:x.y.z". Trả về số phiên bản.
function Read-ReplayVersion([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  try {
    $reader = New-Object IO.BinaryReader($stream, [Text.Encoding]::UTF8)
    $start = $reader.ReadString()
    [void]$reader.ReadString()
    $version = $reader.ReadString()
  } catch {
    throw 'File tải về không phải replay hợp lệ.'
  } finally {
    $stream.Dispose()
  }
  if ($start -notmatch '^\d{4}-\d{2}-\d{2} ') { throw 'File tải về không phải replay hợp lệ.' }
  if ($version -notmatch 'ver:\s*(\S+)') { throw 'File tải về không phải replay hợp lệ.' }
  return $Matches[1]
}

function Install-Replay([string]$Id) {
  $server = Get-ServerUrl
  New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null
  $temp = Join-Path $env:TEMP ("ayame-{0}-{1}.part" -f $Id, [guid]::NewGuid().ToString('N'))
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    try {
      $response = Invoke-WebRequest -Uri "$server/api/replays/$Id/file" -OutFile $temp -PassThru -UseBasicParsing -TimeoutSec 180
    } catch [System.Net.WebException] {
      if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 404) { throw 'Replay này không còn trên web.' }
      throw "Không kết nối được tới $server. Hãy kiểm tra mạng rồi thử lại."
    }

    $size = (Get-Item -LiteralPath $temp).Length
    if ($size -le 0 -or $size -gt $MaxBytes) { throw 'File tải về không hợp lệ.' }
    $hash = (Get-FileHash -LiteralPath $temp -Algorithm SHA256).Hash.ToLowerInvariant()
    $expected = ([string]$response.Headers['X-Ayame-Sha256']).ToLowerInvariant()
    if ($expected -and $hash -ne $expected) { throw 'File tải về bị lỗi giữa chừng, hãy thử lại.' }
    $version = Read-ReplayVersion $temp

    # Đã cài rồi thì thôi — chỉ băm các file có cùng kích thước để khỏi đọc cả thư mục.
    foreach ($file in Get-ChildItem -LiteralPath $ArchiveDir -Filter '*.ayame' -File | Where-Object { $_.Length -eq $size }) {
      if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() -eq $hash) {
        Show-Message "Replay này đã có trong game rồi:`n$($file.Name)`n`nMở Idol Showdown → Archive để xem."
        return
      }
    }

    $name = [string]$response.Headers['X-Ayame-Filename']
    if ($name -cnotmatch '^[A-Za-z0-9_]{1,120}\.ayame$') { $name = "$Id.ayame" }
    $target = Join-Path $ArchiveDir $name
    if (Test-Path -LiteralPath $target) {
      $target = Join-Path $ArchiveDir ('{0}{1}.ayame' -f [IO.Path]::GetFileNameWithoutExtension($name), $Id)
    }
    Move-Item -LiteralPath $temp -Destination $target

    $title = [Uri]::UnescapeDataString([string]$response.Headers['X-Ayame-Title'])
    Show-Message ("Đã cài replay vào game:`n$title`n`n" +
      "Mở Idol Showdown → Archive để xem.`n" +
      "Lưu ý: replay ghi ở phiên bản $version — game chỉ mở được replay cùng phiên bản.")
  } finally {
    if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
  }
}

try {
  if ($Install) { Install-Handler; exit 0 }
  if ($Uninstall) { Uninstall-Handler; exit 0 }

  $link = ([string]$Uri).Trim()
  if ($link -match '^ayame://open-archive/?$') {
    New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null
    Start-Process -FilePath (Join-Path $env:SystemRoot 'explorer.exe') -ArgumentList "`"$ArchiveDir`""
    exit 0
  }
  if ($link -match '^ayame://install/([A-Za-z0-9]{10})/?$') {
    Install-Replay $Matches[1]
    exit 0
  }
  Show-Message "Liên kết không hợp lệ:`n$link" 'Warning'
  exit 1
} catch {
  Show-Message ("Có lỗi xảy ra:`n`n" + $_.Exception.Message) 'Error'
  exit 1
}
