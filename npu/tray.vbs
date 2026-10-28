Option Explicit
Dim shell, fso, folder, powershell, script, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
script = folder & "\tray.ps1"
command = """" & powershell & """ -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -STA -File """ & script & """"
shell.Run command, 0, False
