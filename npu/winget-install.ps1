#requires -Version 5.1
param(
    [string]$ManifestPath,
    [string]$Version = '0.1.4',
    [switch]$EnableLocalManifests
)

$ErrorActionPreference = 'Stop'
$packageId = 'Kooraseru.DiscourseCommunityNotesNPU'
$command = Get-Command 'winget.exe' -CommandType Application -ErrorAction SilentlyContinue
if (-not $command) {
    Write-Error 'winget is missing. install/update App Installer from the microsoft store first.'
    exit 1
}
$winget = $command.Source

if ($EnableLocalManifests) {
    Write-Host 'enabling local winget manifests (one-time windows admin approval)...'
    & $winget settings --enable LocalManifestFiles
    exit $LASTEXITCODE
}

if (-not $ManifestPath -or -not (Test-Path -LiteralPath $ManifestPath)) {
    Write-Error 'the winget package manifest is missing.'
    exit 1
}

function Get-InstalledVersion {
    $uninstall = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
    $apps = Get-ChildItem -Path $uninstall -ErrorAction SilentlyContinue |
        ForEach-Object { Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction SilentlyContinue } |
        Where-Object { $_.DisplayName -eq 'Community Notes NPU Launcher' }
    return @($apps | Select-Object -First 1).DisplayVersion
}

$installed = Get-InstalledVersion
if ($installed) {
    try {
        if ([version]$installed -ge [version]$Version) {
            Write-Host "community notes npu v$installed is already installed. you're good."
            exit 0
        }
    } catch {
        Write-Host "existing app version: $installed"
    }
}

$verb = if ($installed) { 'upgrade' } else { 'install' }

# Prefer the real winget catalog once Microsoft accepts the upstream package.
# Until then, the same winget executable installs from our release manifest.
$inCatalog = $false
try {
    $catalogOutput = & $winget show --id $packageId --exact --source winget --accept-source-agreements 2>&1 | Out-String
    $inCatalog = $LASTEXITCODE -eq 0
} catch {
    $inCatalog = $false
}
if ($inCatalog) {
    Write-Host 'found our app in the public winget catalog.'
    $output = & $winget $verb --id $packageId --exact --source winget --interactive --accept-package-agreements --accept-source-agreements 2>&1 | Out-String
    Write-Host $output
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'winget could not install or upgrade from the public catalog.'
        exit 1
    }
    Write-Host 'done. open community notes npu from the start menu.'
    exit 0
}

Write-Host 'using the release manifest with winget (not a manual exe download).'
function Invoke-LocalInstall {
    try {
        $output = & $winget $verb --manifest $ManifestPath --interactive --accept-package-agreements --accept-source-agreements 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
    } catch {
        $output = [string]$_
        $exitCode = if ($LASTEXITCODE) { $LASTEXITCODE } else { 1 }
    }
    Write-Host $output
    return @{ Code = $exitCode; Text = $output }
}

$result = Invoke-LocalInstall
# Some older hand-installed Inno versions aren't linked to a WinGet
# package yet. In that case, install with the same AppId upgrades in place.
if ($result.Code -ne 0 -and $verb -eq 'upgrade' -and
    $result.Text -match '(?i)no installed package|no applicable update|no package found matching|not found in installed') {
    Write-Host 'winget did not recognize the older install. trying an in-place install.'
    $verb = 'install'
    $result = Invoke-LocalInstall
}
if ($result.Code -ne 0 -and
    ($result.Code -eq -1978335203 -or $result.Text -match '(?i)localmanifestfiles|administrator setting|requires.*admin|local manifest.*disabled|experimental feature.*disabled|0x8a15001d')) {
    Write-Host 'winget needs permission to use release manifests. approve the windows popup once.'
    $powershell = Join-Path $PSHOME 'powershell.exe'
    $arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $PSCommandPath + '" -EnableLocalManifests'
    try {
        $admin = Start-Process -FilePath $powershell -ArgumentList $arguments -Verb RunAs -Wait -PassThru
    } catch {
        Write-Error "windows admin approval was cancelled or blocked: $_"
        exit 1
    }
    if ($admin.ExitCode -ne 0) {
        Write-Error 'winget could not enable local manifests. check windows policy / admin permissions.'
        exit 1
    }
    Write-Host 'permission enabled. retrying winget...'
    $result = Invoke-LocalInstall
}

if ($result.Code -ne 0) {
    Write-Error ('winget failed with exit code ' + $result.Code + '. see the error above.')
    exit 1
}

Write-Host 'done. open community notes npu from the start menu. no terminal needed after this.'
exit 0
