Option Explicit
Dim shell, fso, folder, powershell, script, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
powershell = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
script = folder & "\tray.ps1"
command = Chr(34) & powershell & Chr(34) & " -NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -STA -File " & Chr(34) & script & Chr(34)
If WScript.Arguments.Count > 0 Then
    If LCase(WScript.Arguments.Item(0)) = "show" Then command = command & " -Show"
End If
shell.Run command, 0, False
