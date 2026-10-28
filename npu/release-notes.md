## community notes npu launcher v0.1.3

fixes the windows named-event signal used to reopen an already-running tray gui.

windows 11 arm64 / snapdragon — no terminal needed for day-to-day use.

- new native windows system tray controller with a status window
- start, stop, and restart geniex with a click
- choose whether it starts with windows (enabled by default)
- run the server invisibly, with no powershell window
- restart geniex after crashes, with a limit to prevent endless restart loops
- prepare the qwen2.5-vl w4a16 vision model in the background
- view local status and controller log
- handles existing genieX server instances without terminating unrelated processes
- clicking the start menu shortcut opens the existing GUI instead of launching a duplicate

the tray controls an existing qualcomm geniex installation. if qualcomm geniex is not installed yet, use the included setup/repair shortcut once.

notes: native geniex v0.10.0 may still crash inside its vlm cleanup; the tray detects process exit and restarts it up to three times within five minutes.
