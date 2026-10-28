# npu backend

windows 11 arm64 / snapdragon x elite, using msys2 bash.

install:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/gemini-nano/npu/install.sh \
  | bash
```

this downloads the v0.1.1 release installer, verifies its sha256, and opens it.
the installer sets up the local geniex backend, and starts the companion when you log into windows.

local endpoint: `http://127.0.0.1:18181/v1`

winget local yaml manifests need an elevated windows setting, so this one-command installer
uses the signed-hash-verified release exe directly instead. no admin setting or repo clone needed.

the qualcomm installer and our launcher are unsigned. first setup downloads the model and has not
been verified on physical snapdragon x elite hardware yet.
