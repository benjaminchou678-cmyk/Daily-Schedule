import { spawn } from "node:child_process";

function escapePowerShell(value) {
  return String(value).replace(/'/g, "''");
}

export function notifyDesktop(title, message, options = {}) {
  if (process.env.DISABLE_DESKTOP_NOTIFICATIONS === "1") {
    console.log(`[notification] ${title}: ${message}${options.clickUrl ? ` -> ${options.clickUrl}` : ""}`);
    return;
  }

  const safeTitle = escapePowerShell(title);
  const safeMessage = escapePowerShell(message);
  const safeClickUrl = options.clickUrl ? escapePowerShell(options.clickUrl) : "";
  const clickHandler = safeClickUrl ? `
$notify.add_BalloonTipClicked({ Start-Process '${safeClickUrl}' })
$notify.add_Click({ Start-Process '${safeClickUrl}' })
` : "";
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.BalloonTipTitle = '${safeTitle}'
$notify.BalloonTipText = '${safeMessage}'
$notify.Visible = $true
${clickHandler}
$notify.ShowBalloonTip(7000)
Start-Sleep -Seconds 12
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

export function showChoicePrompt(title, message, options = {}) {
  if (process.env.DISABLE_DESKTOP_NOTIFICATIONS === "1") {
    console.log(`[prompt] ${title}: ${message}`);
    return;
  }

  const safeTitle = escapePowerShell(title);
  const safeMessage = escapePowerShell(message);
  const safeFillUrl = options.fillUrl ? escapePowerShell(options.fillUrl) : "";
  const safeLaterMessage = escapePowerShell(options.laterMessage || message);
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object System.Windows.Forms.Form
$form.Text = '${safeTitle}'
$form.Width = 390
$form.Height = 190
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.StartPosition = 'Manual'
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$form.Left = $screen.Right - $form.Width - 18
$form.Top = $screen.Bottom - $form.Height - 18

$label = New-Object System.Windows.Forms.Label
$label.Text = '${safeMessage}'
$label.Left = 18
$label.Top = 18
$label.Width = 340
$label.Height = 72
$label.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9)
$form.Controls.Add($label)

$fill = New-Object System.Windows.Forms.Button
$fill.Text = '填写'
$fill.Left = 38
$fill.Top = 108
$fill.Width = 86
$fill.Add_Click({ if ('${safeFillUrl}') { Start-Process '${safeFillUrl}' }; $form.Close() })
$form.Controls.Add($fill)

$later = New-Object System.Windows.Forms.Button
$later.Text = '稍后提醒'
$later.Left = 146
$later.Top = 108
$later.Width = 92
$later.Add_Click({
  $form.Hide()
  Start-Sleep -Seconds 1800
  $notify = New-Object System.Windows.Forms.NotifyIcon
  $notify.Icon = [System.Drawing.SystemIcons]::Information
  $notify.BalloonTipTitle = '${safeTitle}'
  $notify.BalloonTipText = '${safeLaterMessage}'
  $notify.Visible = $true
  $notify.ShowBalloonTip(7000)
  Start-Sleep -Seconds 8
  $notify.Dispose()
  $form.Close()
})
$form.Controls.Add($later)

$exit = New-Object System.Windows.Forms.Button
$exit.Text = '退出'
$exit.Left = 260
$exit.Top = 108
$exit.Width = 86
$exit.Add_Click({ $form.Close() })
$form.Controls.Add($exit)

[void]$form.ShowDialog()
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

export function showYesNoPrompt(title, message, options = {}) {
  if (process.env.DISABLE_DESKTOP_NOTIFICATIONS === "1") {
    console.log(`[prompt] ${title}: ${message}`);
    if (options.yesMessage) console.log(`[notification] ${title}: ${options.yesMessage}`);
    return;
  }

  const safeTitle = escapePowerShell(title);
  const safeMessage = escapePowerShell(message);
  const safeYesMessage = options.yesMessage ? escapePowerShell(options.yesMessage) : "";
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object System.Windows.Forms.Form
$form.Text = '${safeTitle}'
$form.Width = 390
$form.Height = 190
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.StartPosition = 'Manual'
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$form.Left = $screen.Right - $form.Width - 18
$form.Top = $screen.Bottom - $form.Height - 18

$label = New-Object System.Windows.Forms.Label
$label.Text = '${safeMessage}'
$label.Left = 18
$label.Top = 24
$label.Width = 340
$label.Height = 64
$label.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 10)
$form.Controls.Add($label)

$yes = New-Object System.Windows.Forms.Button
$yes.Text = '是'
$yes.Left = 82
$yes.Top = 108
$yes.Width = 92
$yes.Height = 30
$yes.BackColor = [System.Drawing.Color]::FromArgb(159, 215, 255)
$yes.Add_Click({
  if ('${safeYesMessage}') {
    $notify = New-Object System.Windows.Forms.NotifyIcon
    $notify.Icon = [System.Drawing.SystemIcons]::Information
    $notify.BalloonTipTitle = '${safeTitle}'
    $notify.BalloonTipText = '${safeYesMessage}'
    $notify.Visible = $true
    $notify.ShowBalloonTip(7000)
    Start-Sleep -Seconds 8
    $notify.Dispose()
  }
  $form.Close()
})
$form.Controls.Add($yes)

$no = New-Object System.Windows.Forms.Button
$no.Text = '否'
$no.Left = 214
$no.Top = 108
$no.Width = 92
$no.Height = 30
$no.BackColor = [System.Drawing.Color]::FromArgb(255, 193, 216)
$no.Add_Click({ $form.Close() })
$form.Controls.Add($no)

[void]$form.ShowDialog()
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
