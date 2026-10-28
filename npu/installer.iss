#ifndef MyAppVersion
  #define MyAppVersion "0.1.2"
#endif

[Setup]
AppId={{21B7A073-49D3-4CE7-A76E-853686C15BC0}
AppName=Community Notes NPU Launcher
AppVersion={#MyAppVersion}
AppPublisher=Kooraseru
AppPublisherURL=https://github.com/Kooraseru/discourse-community-notes
AppSupportURL=https://github.com/Kooraseru/discourse-community-notes/issues
DefaultDirName={localappdata}\Programs\CommunityNotesNPU
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=arm64
ArchitecturesInstallIn64BitMode=arm64
OutputDir=..\dist
OutputBaseFilename=CommunityNotesNPU-Setup-{#MyAppVersion}-arm64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
LicenseFile=..\LICENSE

[Files]
Source: "tray.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "tray.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "run.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Community Notes NPU"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\tray.vbs"" show"; WorkingDir: "{app}"
Name: "{autoprograms}\Community Notes NPU Setup and Repair"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoExit -NoProfile -ExecutionPolicy Bypass -File ""{app}\run.ps1"""; WorkingDir: "{app}"

[Run]
Filename: "{sys}\wscript.exe"; Parameters: """{app}\tray.vbs"" show"; Description: "Launch Community Notes NPU tray controls"; Flags: postinstall nowait skipifsilent
