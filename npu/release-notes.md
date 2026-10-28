## Windows ARM64 NPU launcher

Finally, an installer instead of another paragraph telling you to install things yourself.

- Installs a Start menu shortcut for the Community Notes NPU server.
- First launch downloads Qualcomm's official GenieX installer, checks its SHA256, and lets you finish the Qualcomm setup.
- Pulls the Qwen2.5-VL vision model and serves it locally at 127.0.0.1:18181.
- The userscript keeps Gemini Nano as a fallback if GenieX isn't running.

This is experimental. The model download is fairly large, Qualcomm's installer and this launcher are unsigned, and the NPU path has not been tested on a physical Snapdragon X Elite yet. Don't expect magic.

Download the ARM64 .exe below. The .yaml is a **local** WinGet manifest — the package isn't in Microsoft's public catalog yet.
