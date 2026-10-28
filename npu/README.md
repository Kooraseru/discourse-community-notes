# Optional Snapdragon NPU backend

The gemini-nano userscript can use Qualcomm [GenieX](https://github.com/qualcomm/GenieX) instead of Chrome's built-in Gemini Nano when a compatible local vision model is available. It falls back to Gemini Nano when the server isn't running or inference fails.

## Install (Windows 11 ARM64 / Snapdragon X Elite)

1. Download the **CommunityNotesNPU-Setup-0.1.0-arm64.exe** asset from the [NPU launcher release](https://github.com/Kooraseru/discourse-community-notes/releases/tag/npu-v0.1.0).
2. Run it. It installs a per-user Start menu shortcut: **Community Notes NPU Server**.
3. Open that shortcut. On first run, it downloads the [official GenieX Windows ARM64 installer](https://github.com/qualcomm/GenieX/releases/tag/v0.10.0) (pinned to v0.10.0, SHA256-verified), runs its setup, pulls a vision model, and starts the local inference server.
4. Keep that terminal open while using the [gemini-nano userscript](https://github.com/Kooraseru/discourse-community-notes/blob/gemini-nano/discourse-community-notes.user.js).

The backend listens on http://127.0.0.1:18181/v1, not on a public interface. Tampermonkey needs permission to connect to 127.0.0.1.

If GenieX was installed already, the launcher skips its download. You can also use the checkout's npu/setup.ps1 to start the server without installing the shortcut.

## WinGet

The release includes a .yaml manifest pointing to our ARM64 installer. Until the package is accepted into the official WinGet catalog, it is a **local manifest**, not a globally discoverable winget package.

Download the YAML from the release, then in an elevated PowerShell window:

    winget settings --enable LocalManifestFiles
    winget install --manifest .\Kooraseru.DiscourseCommunityNotesNPU.yaml

The manifest is also generated into winget/Kooraseru.DiscourseCommunityNotesNPU.yaml by the release workflow.

## What happens on first launch

- Downloads the official Qualcomm GenieX installer if geniex.exe is absent from PATH. The pinned download's SHA256 is checked before execution.
- Calls geniex pull ai-hub-models/Qwen2.5-VL-7B-Instruct; this can be a large download, and chipset compatibility is not guaranteed.
- Calls geniex serve. The userscript can then send post text and up to four resized images to the localhost endpoint.
- Closing the terminal stops the server.

This is experimental. Qualcomm's Windows installer and our launcher are unsigned, so Windows SmartScreen can complain. Hardware and model support must be validated on the actual machine. No model or Qualcomm runtime is bundled in our installer, and uninstalling our launcher does not uninstall GenieX or its model cache.

The backend intentionally uses one model request per note, instead of the multi-stage Gemini Nano path. Model output is not factual verification; users still have to review notes.
