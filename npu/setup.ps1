#requires -Version 5.1
$ErrorActionPreference = "Stop"

$geniex = Get-Command geniex -ErrorAction SilentlyContinue
if (-not $geniex) {
    Write-Host "GenieX is not installed or not on PATH."
    Write-Host "Install the official Windows ARM64 GenieX release from:"
    Write-Host "https://github.com/qualcomm/GenieX/releases"
    Write-Host "Then open a NEW PowerShell window and run this script again."
    exit 1
}

$model = "ai-hub-models/Qwen2.5-VL-7B-Instruct"
Write-Host "Downloading an NPU-targeted vision model: $model"
& geniex pull $model
if ($LASTEXITCODE -ne 0) {
    throw "Model download failed. Run 'geniex model list' to check compatible models for this chipset."
}

Write-Host "Starting the GenieX local inference server at http://127.0.0.1:18181"
Write-Host "Keep this terminal open while using Discourse Community Notes."
& geniex serve
if ($LASTEXITCODE -ne 0) {
    throw "GenieX server exited with code $LASTEXITCODE"
}
