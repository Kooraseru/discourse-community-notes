# discourse community notes

you know those little notes that show up under posts when somebody gets something wrong? yeah. that, but on discourse forums.

it reads the replies and tries to add a short correction under the original post. sometimes there's nothing worth correcting, so it just doesn't show a note. that's better than making shit up.

this is a userscript, not a forum plugin. nothing gets posted to the actual website.

## get it

install [tampermonkey](https://www.tampermonkey.net/), then [install the userscript](https://github.com/Kooraseru/discourse-community-notes/raw/refs/heads/gemini-nano/discourse-community-notes.user.js).

open a discourse thread. that's literally it. chrome's built-in ai can handle notes on its own if it's available, so you don't need the npu stuff below unless you want it.

## got a snapdragon laptop?

if you're on windows 11 arm64, you can run the model on your own npu. no cloud, no leaving a powershell window open like a caveman.

open **msys2 clangarm64** once and paste this:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/gemini-nano/npu/install.sh \
  | bash
```

that's the install *and* update command. rerun it whenever you want the latest launcher. no git clone, no downloading an exe by hand.

**yes, it uses winget.** curl just grabs the little setup files. winget handles downloading the actual app and checking its hash. you might get a windows admin popup the first time. approve it if you trust this repo.

one annoying catch: **the app isn't in microsoft's public winget list yet.** so plain `winget install --id Kooraseru.DiscourseCommunityNotesNPU` won't work until that gets accepted. the command above uses the release's winget file instead. still winget; no manually running an installer. if the admin popup is blocked by your pc's policies, local winget installs won't work either.

## and now?

open **community notes npu** from the windows start menu. there's an actual windows window with buttons now. shocking, i know.

- **start / stop / restart** — does exactly what it says.
- **start with windows** — turn it on or off. no startup-folder archaeology.
- **install geniex** — only if qualcomm's thing isn't on your pc yet. click through their installer when it opens.
- **prepare vision model** — grabs the model the first time. it's a few gigs, not every time.
- **view log** — if something goes wrong, that's where the useful stuff is.

close the window and the little tray icon stays running. check under the **^** by your clock. right-click it for the same controls. **quit tray and stop server** actually quits it.

if you updated from an older version while the tray was already running, quit that old tray once and open **community notes npu** again from the start menu. then you're on the new one.

if geniex randomly crashes (yeah, that happened), the tray tries restarting it a few times. if it keeps crashing, it stops trying instead of looping forever.

already had geniex open in a terminal? close that old window first. the tray won't kill a separate server it didn't start.

## something's fucked?

if the note says **local npu**, it's using your snapdragon. if it says **local ai**, it's using chrome instead. if there's no note, it might have decided there wasn't enough evidence, or something might've failed.

the model can still get facts wrong. don't take an ai-generated note as proof of anything. it should be supported by replies, not invented out of thin air.

if the tray won't start, open it from the start menu and check **view log**. if the model isn't there, hit **prepare vision model**. if geniex is missing, hit **install geniex**. no terminal needed.

want to get rid of the launcher? winget can handle that too:

```bash
winget.exe uninstall \
  --name "Community Notes NPU Launcher" \
  --exact
```

or just use **windows settings → apps → installed apps** like a normal person. the userscript is separate; remove that in tampermonkey if you want.

## other stuff

works on discourse forums with the usual page layout. some forums are customized enough to break things.

notes are local to your browser. this doesn't add a voting system, change anybody else's posts, or upload your forum data to some notes server.

the code is [here](https://github.com/Kooraseru/discourse-community-notes/tree/gemini-nano), and it's under the [isc license](LICENSE).
