#requires -Version 5.1
# Existing checkout-based entry point. The release installer creates a Start menu shortcut instead.
& (Join-Path $PSScriptRoot 'run.ps1')
exit $LASTEXITCODE
