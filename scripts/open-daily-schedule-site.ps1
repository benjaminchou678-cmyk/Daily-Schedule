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

function Test-ScheduleEdgeApp {
  Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and (
        $_.CommandLine -match "--app=$([regex]::Escape($url))" -or
        $_.CommandLine -match [regex]::Escape($fallbackFile)
      )
    } |
    Select-Object -First 1
}

$ready = $false
$deadline = (Get-Date).AddSeconds(5)
while ((Get-Date) -lt $deadline) {
  if (Test-ScheduleServer) {
    $ready = $true
    break
  }
  Start-Sleep -Milliseconds 250
}

$target = if ($ready) { $url } else { $fallbackFile }

if (Test-ScheduleEdgeApp) {
  Write-StartupLog "frontend_open skipped=edge_exists ready=$ready elapsed_ms=$([int]((Get-Date) - $startedAt).TotalMilliseconds)"
} elseif (Test-Path $edgePath) {
  Start-Process -FilePath $edgePath -ArgumentList "--app=$target"
} else {
  Start-Process $target
}

$elapsed = [int]((Get-Date) - $startedAt).TotalMilliseconds
Write-StartupLog "frontend_open target=$target ready=$ready elapsed_ms=$elapsed"
