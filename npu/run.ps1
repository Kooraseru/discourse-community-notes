#requires -Version 5.1

$ErrorActionPreference = 'Stop'

# Keep this in sync with GENIEX_MODEL in discourse-community-notes.user.js.
$model = 'ai-hub-models/Qwen2.5-VL-7B-Instruct'
$geniexVersion = 'v0.10.0'
$installerName = "geniex-cli-setup-windows-arm64-$geniexVersion.exe"
$installerUrl = "https://github.com/qualcomm/GenieX/releases/download/$geniexVersion/$installerName"
$installerSha256 = '1916e98741578abc629364e8c144360f0040f41bd37f1a204164b04162c624be'

function Find-GenieX {
    $command = Get-Command 'geniex.exe' -CommandType Application -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    return $null
}

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user = [Environment]::GetEnvironmentVariable('Path', 'User')
    $paths = @($machine, $user, $env:Path) | Where-Object { $_ }
    $env:Path = $paths -join ';'
}

try {
    $geniex = Find-GenieX
    if (-not $geniex) {
        Write-Host 'GenieX is missing. Downloading the official Qualcomm Windows ARM64 installer...'
        Write-Host 'Qualcomm currently ships an unsigned installer; Windows SmartScreen may warn you.'

        $download = Join-Path $env:TEMP $installerName
        Invoke-WebRequest -Uri $installerUrl -OutFile $download -UseBasicParsing

        $actualSha256 = (Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash
        if ($actualSha256 -ine $installerSha256) {
            throw "Installer hash mismatch. Expected $installerSha256, got $actualSha256. Nothing was executed."
        }

        Write-Host 'Hash verified. Finish the Qualcomm setup window to continue.'
        $installer = Start-Process -FilePath $download -Wait -PassThru
        if ($installer.ExitCode -ne 0) {
            throw "Qualcomm installer exited with code $($installer.ExitCode)."
        }

        # Installer PATH changes are not reflected in an already-open terminal.
        Refresh-Path
        $geniex = Find-GenieX
        if (-not $geniex) {
            throw 'GenieX finished installing, but geniex.exe is not on PATH. Open a new terminal, verify geniex --help works, then launch this shortcut again.'
        }
    }

    Write-Host "Preparing the local vision model: $model"
    Write-Host 'First run can take a while. Subsequent runs use the model cache.'
    & $geniex pull $model
    if ($LASTEXITCODE -ne 0) {
        throw "Model download failed (exit $LASTEXITCODE). Run 'geniex model list' to check chipset support."
    }

    Write-Host 'Starting the local NPU backend on http://127.0.0.1:18181/v1'
    Write-Host 'Leave this window open while using Community Notes. Ctrl+C stops the server.'
    & $geniex serve
    if ($LASTEXITCODE -ne 0) {
        throw "GenieX server exited with code $LASTEXITCODE."
    }
}
catch {
    Write-Error $_
    exit 1
}
