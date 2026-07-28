$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 5173
$url = "http://127.0.0.1:$port"
$fallbackFile = Join-Path $projectRoot "schedule.html"
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

function Test-ScheduleServer {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-ScheduleServer)) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  $bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  $nodePath = if ($nodeCommand) { $nodeCommand.Source } elseif (Test-Path $bundledNode) { $bundledNode } else { $null }

  if ($nodePath) {
    Start-Process -FilePath $nodePath -ArgumentList "backend\server.mjs" -WorkingDirectory $projectRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
  }
}

$target = if (Test-ScheduleServer) { $url } else { $fallbackFile }

if (Test-Path $edgePath) {
  Start-Process -FilePath $edgePath -ArgumentList "--app=$target"
} else {
  Start-Process $target
}
