$ErrorActionPreference = "SilentlyContinue"

$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 5173
$url = "http://127.0.0.1:$port"
$fallbackFile = Join-Path $projectRoot "schedule.html"
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$logDir = Join-Path $projectRoot "backend\logs"
$logPath = Join-Path $logDir "startup.log"
$startedAt = Get-Date

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Write-StartupLog {
  param([string]$Message)
  Add-Content -LiteralPath $logPath -Value "[$((Get-Date).ToString('s'))] $Message"
}

function Test-ScheduleServer {
  try {
    $response = Invoke-WebRequest -Uri "$url/api/health" -UseBasicParsing -TimeoutSec 1
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

$ready = Test-ScheduleServer
$target = if ($ready) { $url } else { $fallbackFile }

if (Test-Path $edgePath) {
  Start-Process -FilePath $edgePath -ArgumentList "--app=$target"
} else {
  Start-Process $target
}

$elapsed = [int]((Get-Date) - $startedAt).TotalMilliseconds
Write-StartupLog "frontend_open target=$target ready=$ready elapsed_ms=$elapsed"
