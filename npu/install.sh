#!/usr/bin/env bash
set -euo pipefail

# run this in msys2 clangarm64. curl only fetches the winget manifest
# and helper; winget is responsible for the real installer + sha256.
version='0.1.4'
id='Kooraseru.DiscourseCommunityNotesNPU'
installer_sha256='7d318861f7f4fbc26a811f13b56c7d73e4d67a16e04d6cab22e42bd55a1f507b'
base='https://github.com/Kooraseru/discourse-community-notes'
manifest_url="${base}/releases/download/npu-v${version}/${id}.yaml"
helper_url='https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/24868093eb69c1e1ed51e13ca08e70a98249ebd1/npu/winget-install.ps1'

if ! command -v cygpath >/dev/null 2>&1; then
  echo "this one's for msys2 on windows, not linux. open msys2 clangarm64." >&2
  exit 1
fi
if ! command -v powershell.exe >/dev/null 2>&1; then
  echo "can't find windows powershell. run this from msys2 clangarm64." >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
manifest="$work/${id}.yaml"
helper="$work/winget-install.ps1"

echo 'grabbing the winget package info...'
curl -fsSL --retry 3 "$manifest_url" -o "$manifest"
curl -fsSL --retry 3 "$helper_url" -o "$helper"

# Trust the pinned release, not a surprise package or a different installer.
manifest_text="$(tr -d '\r' < "$manifest")"
if ! grep -Fxq "PackageIdentifier: $id" <<< "$manifest_text" ||
   ! grep -Fxq "PackageVersion: $version" <<< "$manifest_text" ||
   ! grep -Fxq "    InstallerSha256: ${installer_sha256^^}" <<< "$manifest_text"; then
  echo 'winget package info was not what we expected. not installing anything.' >&2
  exit 1
fi

echo 'letting winget handle the install/upgrade...'
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass \
  -File "$(cygpath -w "$helper")" \
  -ManifestPath "$(cygpath -w "$manifest")" \
  -Version "$version"
