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

if you're on windows 11 arm64 with a snapdragon x elite, here's how to get the local npu stuff running. no cloning the repo, no fucking around with winget manifests.

1. install [tampermonkey](https://www.tampermonkey.net/) and [the gemini-nano userscript](https://github.com/Kooraseru/discourse-community-notes/raw/refs/heads/gemini-nano/discourse-community-notes.user.js). use this branch's script, not the `main` one.
2. open **msys2 clangarm64** and paste this entire command:

   ```bash
   curl -fsSL \
     https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/gemini-nano/npu/install.sh \
     | bash
   ```

3. the script downloads the **v0.1.1** windows arm64 installer and checks its sha256 before launching it. click through the community notes setup. leave **set up and start the npu backend** checked.
4. when qualcomm's geniex installer pops up, finish that too. yes, there are two installers. the first setup can take a while because it downloads a vision model. don't close the server window while it's working.
5. check that the server is alive from msys2:

   ```bash
   curl -fsS \
     http://127.0.0.1:18181/v1/models
   ```

   if you get json back, you're good. if you get `connection refused`, the backend isn't running. open **community notes npu server** from the start menu and read the error there instead of reinstalling everything.
6. open a discourse thread and try it. the userscript falls back to gemini nano if the local server isn't available.

the launcher adds itself to windows startup so it can run in the background after login. first-time setup still needs you to finish the installers. the server is local to `127.0.0.1:18181`.

**heads up:** this is experimental and hasn't been confirmed on a real snapdragon x elite yet. the launcher and qualcomm installer are unsigned, so windows might complain. don't blindly bypass a security warning if the file or source doesn't match what you expected.

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
