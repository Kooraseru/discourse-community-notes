<div align="center">
  <h1>Discourse Community Notes</h1>
</div>

Adds community-note style context to Discourse-based forums through a userscript, without modifying the forum backend.

<a id="overview"></a>
## Overview

Discourse Community Notes surfaces contextual replies directly beneath the original post.

When no custom note exists, the userscript uses the most-liked reply as contextual information. The note includes a short excerpt, links back to the source reply, and reuses the reply's existing Discourse like state rather than maintaining a separate voting system.

The interface is built from native Discourse controls and theme variables so it remains compatible with light mode, dark mode, and custom forum themes.

<a id="installation"></a>
## Installation

Requires a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/).

[Install Discourse Community Notes](https://github.com/Kooraseru/discourse-community-notes/raw/refs/heads/main/discourse-community-notes.user.js)

Updates are distributed through the same userscript URL.


## windows on arm / snapdragon npu setup

windows 11 arm64 + snapdragon x elite. the npu backend runs locally and the windows tray app controls it — no terminal required for regular use.

1. install [tampermonkey](https://www.tampermonkey.net/) and the [`gemini-nano` userscript](https://github.com/Kooraseru/discourse-community-notes/raw/refs/heads/gemini-nano/discourse-community-notes.user.js).
2. download and run [Community Notes NPU Launcher v0.1.3 for Windows ARM64](https://github.com/Kooraseru/discourse-community-notes/releases/download/npu-v0.1.3/CommunityNotesNPU-Setup-0.1.3-arm64.exe). it upgrades the old launcher in place.
3. the installer opens a real windows control window. you'll also find **Community Notes NPU** in the start menu and notification area (click the **^** near the clock if the tray icon is hidden).
4. click **start**, **stop**, or **restart** there. turn **start with windows** on or off. closing the control window leaves the tray app running; use **quit tray and stop server** to exit completely.
5. if the model isn't installed, right-click the tray icon and choose **prepare vision model**. if genieX itself isn't installed, use the included **Community Notes NPU Setup and Repair** shortcut once to install it.

the backend only listens on `127.0.0.1:18181`. the tray automatically restarts a crashed geniex process a few times, but stops retrying after repeated crashes. if another geniex instance is already running, the tray shows it as external instead of killing it.

**note:** qualcomm geniex and the launcher are experimental. the launcher installer is unsigned, so check the source before accepting windows smartscreen prompts.

<a id="behavior"></a>
## Behavior

The current implementation:

- Detects Discourse topic pages automatically.
- Adds a Community Note beneath the original post.
- Uses the most-liked loaded reply as context.
- Generates a short one-to-three sentence preview.
- Ignores quoted material when generating the preview.
- Allows the full reply to be expanded when additional context exists.
- Links attribution back to the original reply.
- Mirrors the reply's native like count and state.
- Likes or unlikes the original reply when interacting with the Community Note heart.
- Uses Discourse's native icons, controls, and theme variables.

The userscript does not currently create or store independent Community Notes on the forum server.

<a id="compatibility"></a>
## Compatibility

The userscript is intended for Discourse-based forums.

Compatibility depends on the forum exposing the standard Discourse topic structure and client-side modules used by the script. Heavily customized Discourse installations may require additional handling.

<a id="license"></a>
## License

Discourse Community Notes is distributed under the ISC License. [LICENSE](LICENSE).
