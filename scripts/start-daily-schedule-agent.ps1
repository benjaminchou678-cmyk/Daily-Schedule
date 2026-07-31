$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 5173
$url = "http://127.0.0.1:$port"
$opener = Join-Path $PSScriptRoot "open-daily-schedule-site.ps1"
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

function Get-ScheduleBackendProcess {
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match "backend[\\/]server\.mjs" -and
      $_.CommandLine -match [regex]::Escape($projectRoot)
    } |
    Select-Object -First 1
}

if (-not (Test-ScheduleServer)) {
  $existingProcess = Get-ScheduleBackendProcess
  if ($existingProcess) {
    Write-StartupLog "backend_start skipped=process_exists pid=$($existingProcess.ProcessId) elapsed_ms=$([int]((Get-Date) - $startedAt).TotalMilliseconds)"
  } else {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    $nodePath = if ($nodeCommand) { $nodeCommand.Source } elseif (Test-Path $bundledNode) { $bundledNode } else { $null }

    if ($nodePath) {
      Start-Process -FilePath $nodePath -ArgumentList "backend\server.mjs" -WorkingDirectory $projectRoot -WindowStyle Hidden
      Write-StartupLog "backend_start command=$nodePath elapsed_ms=$([int]((Get-Date) - $startedAt).TotalMilliseconds)"
    } else {
      Write-StartupLog "backend_start skipped=no_node elapsed_ms=$([int]((Get-Date) - $startedAt).TotalMilliseconds)"
    }
  }
} else {
  Write-StartupLog "backend_start skipped=already_running elapsed_ms=$([int]((Get-Date) - $startedAt).TotalMilliseconds)"
}

if (Test-Path $opener) {
  Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$opener`"" -WorkingDirectory $projectRoot -WindowStyle Hidden
  Write-StartupLog "frontend_open delegated elapsed_ms=$([int]((Get-Date) - $startedAt).TotalMilliseconds)"
}

Write-Host "Daily Schedule startup dispatched in $([int]((Get-Date) - $startedAt).TotalMilliseconds)ms"
