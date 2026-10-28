#!/usr/bin/env bash
set -euo pipefail

# winGet local manifests require an elevated, one-time Windows setting.
# use the same GitHub release installer directly instead.
version='0.1.3'
name="CommunityNotesNPU-Setup-${version}-arm64.exe"
sha256='1e683ac5eff86aa77bf8c532a2da7f399c240a8930abac6f657090ea0e893b01'
url="https://github.com/Kooraseru/discourse-community-notes/releases/download/npu-v${version}/${name}"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
installer="$tmpdir/$name"

echo 'downloading the npu installer...'
curl --fail --location --show-error --retry 3 "$url" --output "$installer"

echo 'checking sha256...'
actual="$(sha256sum "$installer")"
actual="${actual%% *}"
if [[ "$actual" != "$sha256" ]]; then
  printf 'sha256 mismatch (expected %s, got %s)\n' "$sha256" "$actual" >&2
  exit 1
fi

echo 'launching the installer...'
"$installer"
echo 'installer finished.'
