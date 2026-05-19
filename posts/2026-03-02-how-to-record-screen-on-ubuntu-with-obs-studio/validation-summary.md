# Validation Summary: How to Record Screen on Ubuntu with OBS Studio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OBS Studio (Open Broadcaster Software)
- Ubuntu (24.04 LTS verified)
- X11 / Wayland display servers
- PipeWire and xdg-desktop-portal
- VA-API (Intel/AMD hardware encoding)
- NVENC (NVIDIA hardware encoding)
- AMD AMF (AMD hardware encoding)
- x264 software encoder
- Flatpak (alternative install method)
- OBS plugins (obs-backgroundremoval, obs-vkcapture, waveform, obs-move-transition)

## Sources Consulted
- OBS Studio official website and docs: https://obsproject.com / https://obsproject.com/wiki/
- OBS Studio Linux installation docs: https://obsproject.com/wiki/install-instructions#linux
- OBS Studio PPA: https://launchpad.net/~obsproject/+archive/ubuntu/obs-studio
- Flathub OBS Studio page: https://flathub.org/apps/com.obsproject.Studio
- Ubuntu 24.04 (Noble) package archive — verified package names via `apt-cache search` / `apt-cache show`
- obs-vkcapture project: https://github.com/nowrep/obs-vkcapture
- PipeWire / xdg-desktop-portal documentation
- VA-API on Linux (Intel/AMD driver naming)

## Issues Found
1. `libpipewire-0.3-dev` was listed in the Wayland setup `apt-get install` command. This is a development header package not needed by end users to run OBS with PipeWire screen capture — the runtime library (`libpipewire-0.3-0t64`) is already pulled in by the `pipewire` metapackage on Ubuntu 24.04. Removed it from the install list.
2. `libva-dev` was listed in the VA-API setup. This is also a dev header package not required for OBS to use VA-API at runtime. Only the driver packages (`intel-media-va-driver` or `mesa-va-drivers`) and `vainfo` (for verification) are needed. Removed `libva-dev` and updated the comment from "Install VA-API drivers" to "Install VA-API tools" since `vainfo` is a diagnostic tool, not a driver.
3. `sudo apt-get install -y obs-vkcapture` would fail on Ubuntu — `obs-vkcapture` is not in the official Ubuntu archive (verified via `apt-cache search obs-vkcapture` on Ubuntu 24.04, which returns no results). Replaced the bad apt command with a comment directing readers to build it from the upstream GitHub repo (https://github.com/nowrep/obs-vkcapture) or use the Flatpak OBS package, which bundles compatible capture.

## Review Notes
- The OBS PPA reference (`ppa:obsproject/obs-studio`) and the Flatpak app ID (`com.obsproject.Studio`) are both correct.
- Source names ("Screen Capture (XSHM)", "Window Capture (Xcomposite)", "Screen Capture (PipeWire)", "Audio Output Capture", "Audio Input Capture") match current OBS source labels on Linux.
- Encoder options (x264, NVENC H.264, VA-API H.264, AMD AMF H.264) and rate-control modes (CRF for x264, CQP for hardware encoders) are accurate. The NVENC preset name "Performance" is one of the legacy named presets OBS exposes alongside the newer P1–P7 scheme; both work.
- The `obs-plugins` Ubuntu package does exist in 24.04 universe — verified — and pulls in the bundled obs-studio plugins. The post's use of it is acceptable, though most users will already have it installed as a recommended dep of `obs-studio`.
- Encoder recommendations (CRF 18–23 for quality, 28–32 for small files, AAC 192 kbps audio, keyframe interval 2 s for streaming, 3500–6000 kbps for 1080p60) are within standard ranges and align with Twitch/YouTube ingest guidelines.
- Hotkey examples (Ctrl+Alt+R, etc.) are user-chosen, not OBS defaults — the post correctly frames them as suggestions to set under Settings → Hotkeys.
- Version-specific caveat: the post does not pin a specific OBS Studio version. As of 2026, OBS Studio 30.x is current in Ubuntu 24.04, and the workflows described match that release line. Major UI restructuring in a future OBS release could shift menu paths.
