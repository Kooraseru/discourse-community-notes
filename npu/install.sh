#!/usr/bin/env bash
set -euo pipefail

version="0.1.1"
manifest="${TMPDIR:-/tmp}/Kooraseru.DiscourseCommunityNotesNPU.yaml"
url="https://github.com/Kooraseru/discourse-community-notes/releases/download/npu-v${version}/Kooraseru.DiscourseCommunityNotesNPU.yaml"

curl -fL "$url" -o "$manifest"
winget.exe settings --enable LocalManifestFiles >/dev/null
winget.exe install --manifest "$(cygpath -w "$manifest")"
