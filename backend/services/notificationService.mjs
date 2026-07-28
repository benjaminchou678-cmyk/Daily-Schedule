import { spawn } from "node:child_process";

function escapePowerShell(value) {
  return String(value).replace(/'/g, "''");
}

export function notifyDesktop(title, message) {
  if (process.env.DISABLE_DESKTOP_NOTIFICATIONS === "1") {
    console.log(`[notification] ${title}: ${message}`);
    return;
  }

  const safeTitle = escapePowerShell(title);
  const safeMessage = escapePowerShell(message);
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.BalloonTipTitle = '${safeTitle}'
$notify.BalloonTipText = '${safeMessage}'
$notify.Visible = $true
$notify.ShowBalloonTip(7000)
Start-Sleep -Seconds 8
$notify.Dispose()
`;

  const child = spawn("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script
  ], {
    windowsHide: true,
    stdio: "ignore"
  });

  child.unref();
}
