# Optional Snapdragon NPU backend

The `gemini-nano` userscript can use [Qualcomm GenieX](https://github.com/qualcomm/GenieX) instead of Chrome's built-in Gemini Nano when a compatible local model is available.

This is **optional**. Without the local server, the script uses Chrome's Prompt API.

## Setup (Windows ARM64, Snapdragon X Elite)

1. Install the official Windows ARM64 GenieX CLI from [Qualcomm's releases](https://github.com/qualcomm/GenieX/releases). Open a new PowerShell window.
2. In the repository, run `powershell -ExecutionPolicy Bypass -File .\\npu\\setup.ps1` after reviewing the script.
3. Keep the terminal running. The GenieX server serves `http://127.0.0.1:18181/v1`.
4. Install/update the userscript from the `gemini-nano` branch. Tampermonkey will request permission to connect to `127.0.0.1`.

The script looks specifically for the model `ai-hub-models/Qwen2.5-VL-7B-Instruct`, a Qualcomm AI Hub vision model designed for the QAIRT backend (Hexagon NPU). If it is not available for your chipset or failed to download, see `geniex model list` and adjust the userscript's `GENIEX_MODEL` constant to an installed, NPU-capable vision model.

When detected, the script sends sampled post text and up to four resized image attachments to the **local** GenieX server. It falls back to Chrome Gemini Nano when GenieX is missing or inference fails.

## Limitations

- GenieX and the model are third-party downloads, not bundled in this repository.
- Neither GPU/NPU usage nor image support has been verified on every Snapdragon machine. Check Windows Task Manager's NPU utilization while generating a note.
- Tampermonkey's `GM_xmlhttpRequest` handles localhost connectivity. Only install this userscript from a source you trust.
- Don't expose GenieX beyond loopback: the local API has no authentication in this setup.
- A model output is not a factual verification. Community Notes still require human review.

The backend is intentionally simple: one model request for a note, not the three-pass Gemini Nano pipeline.
