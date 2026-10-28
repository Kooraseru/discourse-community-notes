## community notes npu v0.1.4

- install or upgrade through winget. no hand-downloaded exe required.
- windows tray and control window: start, stop, restart, launch at login.
- click **install geniex** or **prepare vision model** in the gui. no powershell setup shortcut.
- geniex runs hidden and gets a few automatic restart attempts after crashes.
- package metadata includes user scope and installed-app matching for winget.
- release includes an exact-sha256 winget manifest and upstream-ready three-file manifests.

the public winget catalog doesn't have this package yet. until it's accepted upstream, use the repo's curl-to-winget setup script. windows may ask for admin approval to enable local manifests once.
