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

[Install Discourse Community Notes](https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/main/discourse-community-notes.user.js)

Updates are distributed through the same userscript URL.

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