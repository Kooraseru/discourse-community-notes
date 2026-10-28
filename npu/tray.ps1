#requires -Version 5.1
# Real Windows Forms tray controller. No visible terminal is required.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$createdNew = $false
$singleInstance = [System.Threading.Mutex]::new($true, 'Local\CommunityNotesNPUTray', [ref]$createdNew)
if (-not $createdNew) { exit 0 }

$script:baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:dataDir = Join-Path $env:LOCALAPPDATA 'CommunityNotesNPU'
$script:logFile = Join-Path $script:dataDir 'tray.log'
$script:startupLink = Join-Path ([Environment]::GetFolderPath('Startup')) 'Community Notes NPU.lnk'
$script:startupPreferenceKey = 'HKCU:\Software\CommunityNotesNPU'
$script:modelId = 'qualcomm/Qwen2.5-VL-7B-Instruct:W4A16'
$script:serverUrl = 'http://127.0.0.1:18181/v1/models'
$script:backend = $null
$script:pullProcess = $null
$script:wantsServer = $true
$script:retryAt = [datetime]::MinValue
$script:crashes = [System.Collections.Generic.List[datetime]]::new()
$script:lastError = ''
$script:status = 'starting'
$script:serverOnline = $false
$script:modelPresent = $false

New-Item -ItemType Directory -Path $script:dataDir -Force | Out-Null

function Write-Log([string]$message) {
    try {
        Add-Content -LiteralPath $script:logFile -Value ("{0:u}  {1}" -f (Get-Date), $message) -Encoding UTF8
    } catch { }
}

function Resolve-GenieX {
    $env:PATH = (@(
        [Environment]::GetEnvironmentVariable('Path', 'Machine'),
        [Environment]::GetEnvironmentVariable('Path', 'User'),
        $env:PATH
    ) | Where-Object { $_ }) -join ';'
    $command = Get-Command 'geniex.exe' -CommandType Application -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    return $null
}

function Get-ServerState {
    try {
        $request = [System.Net.WebRequest]::Create($script:serverUrl)
        $request.Timeout = 750
        $request.ReadWriteTimeout = 750
        $response = $request.GetResponse()
        try {
            $reader = [System.IO.StreamReader]::new($response.GetResponseStream())
            try { $body = $reader.ReadToEnd() } finally { $reader.Dispose() }
            $data = ConvertFrom-Json -InputObject $body
            return @{
                Online = $true
                Model = [bool](@($data.data | Where-Object { $_.id -eq $script:modelId }).Count)
            }
        } finally { $response.Dispose() }
    } catch {
        return @{ Online = $false; Model = $false }
    }
}

function Stop-Server {
    $script:wantsServer = $false
    $script:retryAt = [datetime]::MinValue
    if ($script:backend) {
        try {
            if (-not $script:backend.HasExited) {
                $script:backend.Kill()
                $script:backend.WaitForExit(2000) | Out-Null
            }
            Write-Log 'Stopped owned GenieX process.'
        } catch { Write-Log "Could not stop GenieX: $_" }
        try { $script:backend.Dispose() } catch { }
        $script:backend = $null
    }
    $script:status = 'stopped'
    Update-UI
}

function Start-Server {
    $script:wantsServer = $true
    $script:lastError = ''
    if ($script:backend -and -not $script:backend.HasExited) { return }
    if ((Get-ServerState).Online) {
        $script:status = 'running (external)'
        Update-UI
        return
    }
    $exe = Resolve-GenieX
    if (-not $exe) {
        $script:wantsServer = $false
        $script:lastError = 'GenieX not found. Install Qualcomm GenieX first.'
        Write-Log $script:lastError
        Update-UI
        return
    }
    try {
        $start = [System.Diagnostics.ProcessStartInfo]::new()
        $start.FileName = $exe
        $start.Arguments = 'serve'
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $start.WorkingDirectory = Split-Path -Parent $exe
        $script:backend = [System.Diagnostics.Process]::Start($start)
        $script:status = 'starting'
        $script:retryAt = [datetime]::MinValue
        Write-Log "Started GenieX PID $($script:backend.Id)."
    } catch {
        $script:backend = $null
        $script:lastError = "Failed to start GenieX: $_"
        $script:wantsServer = $false
        Write-Log $script:lastError
    }
    Update-UI
}

function Restart-Server {
    Stop-Server
    $script:crashes.Clear()
    Start-Server
}

function Get-StartupEnabled {
    return (Test-Path -LiteralPath $script:startupLink)
}

function Set-StartupEnabled([bool]$enabled) {
    if ($enabled) {
        $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($script:startupLink)
        $shortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
        $shortcut.Arguments = ('"{0}"' -f (Join-Path $script:baseDir 'tray.vbs'))
        $shortcut.WorkingDirectory = $script:baseDir
        $shortcut.Description = 'Community Notes NPU tray controller'
        $shortcut.Save()
    } else {
        Remove-Item -LiteralPath $script:startupLink -Force -ErrorAction SilentlyContinue
    }
    New-Item -Path $script:startupPreferenceKey -Force | Out-Null
    Set-ItemProperty -Path $script:startupPreferenceKey -Name StartWithWindows -Value ([int]$enabled)
    Write-Log "Start with Windows: $enabled"
    Update-UI
}

function Start-ModelDownload {
    if ($script:pullProcess -and -not $script:pullProcess.HasExited) { return }
    $exe = Resolve-GenieX
    if (-not $exe) {
        [System.Windows.Forms.MessageBox]::Show(
            'GenieX is missing. Install it from the official Qualcomm GenieX releases first.',
            'Community Notes NPU', 'OK', 'Warning'
        ) | Out-Null
        return
    }
    try {
        $start = [System.Diagnostics.ProcessStartInfo]::new()
        $start.FileName = $exe
        $start.Arguments = 'pull ai-hub-models/Qwen2.5-VL-7B-Instruct:W4A16'
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $script:pullProcess = [System.Diagnostics.Process]::Start($start)
        Write-Log "Started background model preparation PID $($script:pullProcess.Id)."
        Update-UI
    } catch {
        Write-Log "Model preparation failed: $_"
        [System.Windows.Forms.MessageBox]::Show(
            "Model preparation could not start: $_",
            'Community Notes NPU', 'OK', 'Error'
        ) | Out-Null
    }
}

function Open-Log {
    if (-not (Test-Path -LiteralPath $script:logFile)) {
        Write-Log 'Log opened.'
    }
    Start-Process -FilePath 'notepad.exe' -ArgumentList ('"{0}"' -f $script:logFile)
}

$script:tray = [System.Windows.Forms.NotifyIcon]::new()
$script:tray.Icon = [System.Drawing.SystemIcons]::Information
$script:tray.Text = 'Community Notes NPU'
$script:tray.Visible = $true

$script:menu = [System.Windows.Forms.ContextMenuStrip]::new()
$script:statusItem = [System.Windows.Forms.ToolStripMenuItem]::new('Checking...')
$script:statusItem.Enabled = $false
$script:openItem = [System.Windows.Forms.ToolStripMenuItem]::new('Open controls...')
$script:startItem = [System.Windows.Forms.ToolStripMenuItem]::new('Start server')
$script:stopItem = [System.Windows.Forms.ToolStripMenuItem]::new('Stop server')
$script:restartItem = [System.Windows.Forms.ToolStripMenuItem]::new('Restart server')
$script:downloadItem = [System.Windows.Forms.ToolStripMenuItem]::new('Prepare vision model')
$script:startupItem = [System.Windows.Forms.ToolStripMenuItem]::new('Start with Windows')
$script:logItem = [System.Windows.Forms.ToolStripMenuItem]::new('View log')
$script:quitItem = [System.Windows.Forms.ToolStripMenuItem]::new('Quit tray and stop server')
foreach ($entry in @($script:statusItem, $script:openItem, $script:startItem,
        $script:stopItem, $script:restartItem)) {
    [void]$script:menu.Items.Add($entry)
}
[void]$script:menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
foreach ($entry in @($script:downloadItem, $script:startupItem, $script:logItem)) {
    [void]$script:menu.Items.Add($entry)
}
[void]$script:menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
[void]$script:menu.Items.Add($script:quitItem)
$script:tray.ContextMenuStrip = $script:menu

$script:window = [System.Windows.Forms.Form]::new()
$script:window.Text = 'Community Notes NPU'
$script:window.StartPosition = 'CenterScreen'
$script:window.ClientSize = [System.Drawing.Size]::new(450, 260)
$script:window.FormBorderStyle = 'FixedDialog'
$script:window.MaximizeBox = $false
$script:window.MinimizeBox = $false
$script:window.Font = [System.Drawing.Font]::new('Segoe UI', 10)
$script:window.ShowInTaskbar = $false

$script:heading = [System.Windows.Forms.Label]::new()
$script:heading.Text = 'Community Notes NPU'
$script:heading.Font = [System.Drawing.Font]::new('Segoe UI Semibold', 16)
$script:heading.SetBounds(20, 18, 410, 34)
$script:window.Controls.Add($script:heading)

$script:stateLabel = [System.Windows.Forms.Label]::new()
$script:stateLabel.SetBounds(20, 65, 415, 44)
$script:window.Controls.Add($script:stateLabel)

$script:buttonStart = [System.Windows.Forms.Button]::new()
$script:buttonStart.Text = 'Start'
$script:buttonStart.SetBounds(20, 120, 120, 36)
$script:window.Controls.Add($script:buttonStart)
$script:buttonStop = [System.Windows.Forms.Button]::new()
$script:buttonStop.Text = 'Stop'
$script:buttonStop.SetBounds(156, 120, 120, 36)
$script:window.Controls.Add($script:buttonStop)
$script:buttonRestart = [System.Windows.Forms.Button]::new()
$script:buttonRestart.Text = 'Restart'
$script:buttonRestart.SetBounds(292, 120, 120, 36)
$script:window.Controls.Add($script:buttonRestart)

$script:startupCheck = [System.Windows.Forms.CheckBox]::new()
$script:startupCheck.Text = 'Start with Windows'
$script:startupCheck.SetBounds(20, 180, 225, 25)
$script:window.Controls.Add($script:startupCheck)

$script:buttonLog = [System.Windows.Forms.Button]::new()
$script:buttonLog.Text = 'View log'
$script:buttonLog.SetBounds(292, 177, 120, 32)
$script:window.Controls.Add($script:buttonLog)
$script:tip = [System.Windows.Forms.Label]::new()
$script:tip.Text = 'Closing this window keeps the server in the tray.'
$script:tip.ForeColor = [System.Drawing.Color]::DimGray
$script:tip.SetBounds(20, 222, 410, 23)
$script:window.Controls.Add($script:tip)

function Update-UI {
    $state = Get-ServerState
    $script:serverOnline = $state.Online
    $script:modelPresent = $state.Model
    if ($state.Online) {
        if ($state.Model) { $script:status = 'running' }
        else { $script:status = 'online (model missing)' }
    } elseif ($script:backend -and -not $script:backend.HasExited) {
        $script:status = 'starting'
    } elseif ($script:wantsServer) {
        $script:status = 'waiting to restart'
    } else {
        $script:status = 'stopped'
    }
    $script:statusItem.Text = 'Status: ' + $script:status
    $script:tray.Text = ('Community Notes NPU - ' + $script:status)
    if ($script:tray.Text.Length -gt 63) {
        $script:tray.Text = $script:tray.Text.Substring(0, 63)
    }
    $script:tray.Icon = if ($state.Online -and $state.Model) {
        [System.Drawing.SystemIcons]::Information
    } elseif ($script:lastError) {
        [System.Drawing.SystemIcons]::Error
    } else {
        [System.Drawing.SystemIcons]::Warning
    }

    $owns = $script:backend -and -not $script:backend.HasExited
    $script:startItem.Enabled = -not $owns -and -not $state.Online
    $script:stopItem.Enabled = [bool]$owns
    $script:restartItem.Enabled = [bool]$owns -or -not $state.Online
    $script:buttonStart.Enabled = $script:startItem.Enabled
    $script:buttonStop.Enabled = $script:stopItem.Enabled
    $script:buttonRestart.Enabled = $script:restartItem.Enabled
    $script:startupItem.Checked = Get-StartupEnabled
    $script:startupCheck.Checked = $script:startupItem.Checked
    $extra = if ($script:lastError) { $script:lastError }
        elseif ($state.Online -and -not $state.Model) { 'Click Prepare vision model in the tray menu.' }
        elseif ($state.Online -and -not $owns) { 'An external GenieX instance is running. Close it to use tray controls.' }
        else { 'Local API: 127.0.0.1:18181' }
    $script:stateLabel.Text = "Server: $($script:status)`r`n$extra"
}

$script:openItem.Add_Click({ $script:window.Show(); $script:window.Activate() })
$script:tray.Add_DoubleClick({ $script:window.Show(); $script:window.Activate() })
$script:startItem.Add_Click({ Start-Server })
$script:stopItem.Add_Click({ Stop-Server })
$script:restartItem.Add_Click({ Restart-Server })
$script:downloadItem.Add_Click({ Start-ModelDownload })
$script:startupItem.Add_Click({ Set-StartupEnabled (-not (Get-StartupEnabled)) })
$script:logItem.Add_Click({ Open-Log })
$script:buttonStart.Add_Click({ Start-Server })
$script:buttonStop.Add_Click({ Stop-Server })
$script:buttonRestart.Add_Click({ Restart-Server })
$script:buttonLog.Add_Click({ Open-Log })
$script:startupCheck.Add_Click({ Set-StartupEnabled $script:startupCheck.Checked })
$script:window.Add_FormClosing({
    param($sender, $eventArgs)
    $eventArgs.Cancel = $true
    $script:window.Hide()
})

$script:context = [System.Windows.Forms.ApplicationContext]::new()
$script:quitItem.Add_Click({
    Stop-Server
    $script:tray.Visible = $false
    $script:context.ExitThread()
})

$script:timer = [System.Windows.Forms.Timer]::new()
$script:timer.Interval = 2500
$script:timer.Add_Tick({
    try {
        if ($script:backend -and $script:backend.HasExited) {
            $exitCode = $script:backend.ExitCode
            Write-Log "GenieX exited with code $exitCode."
            $script:backend.Dispose()
            $script:backend = $null
            if ($script:wantsServer) {
                $now = Get-Date
                for ($i = $script:crashes.Count - 1; $i -ge 0; $i--) {
                    if (($now - $script:crashes[$i]).TotalMinutes -gt 5) {
                        $script:crashes.RemoveAt($i)
                    }
                }
                $script:crashes.Add($now)
                if ($script:crashes.Count -ge 4) {
                    $script:wantsServer = $false
                    $script:lastError = 'GenieX crashed repeatedly. Click Restart to try again.'
                    Write-Log $script:lastError
                    $script:tray.ShowBalloonTip(5000, 'Community Notes NPU',
                        $script:lastError, [System.Windows.Forms.ToolTipIcon]::Warning)
                } else {
                    $script:retryAt = $now.AddSeconds(5 * $script:crashes.Count)
                }
            }
        }
        if ($script:pullProcess -and $script:pullProcess.HasExited) {
            $exitCode = $script:pullProcess.ExitCode
            Write-Log "Model preparation finished with code $exitCode."
            $script:pullProcess.Dispose()
            $script:pullProcess = $null
        }
        if ($script:wantsServer -and -not $script:backend -and
                (Get-Date) -ge $script:retryAt -and -not (Get-ServerState).Online) {
            Start-Server
        }
        Update-UI
    } catch { Write-Log "Tray timer error: $_" }
})

try {
    # Upgrade old 0.1.1 startup shortcuts without undoing a later opt-out.
    $preference = Get-ItemProperty -Path $script:startupPreferenceKey -Name StartWithWindows -ErrorAction SilentlyContinue
    if ($null -eq $preference) {
        Set-StartupEnabled $true
    } else {
        Set-StartupEnabled ([bool]$preference.StartWithWindows)
    }
    Write-Log 'Tray controller started.'
    Start-Server
    $script:timer.Start()
    [System.Windows.Forms.Application]::Run($script:context)
} finally {
    $script:timer.Stop()
    $script:tray.Visible = $false
    $script:tray.Dispose()
    $script:timer.Dispose()
    $script:menu.Dispose()
    $script:window.Dispose()
    if ($script:backend) {
        try {
            if (-not $script:backend.HasExited) { $script:backend.Kill() }
            $script:backend.Dispose()
        } catch { }
    }
    if ($script:pullProcess) {
        try { $script:pullProcess.Dispose() } catch { }
    }
    Write-Log 'Tray controller exited.'
    if ($createdNew) { $singleInstance.ReleaseMutex() }
    $singleInstance.Dispose()
}
