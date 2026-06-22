# Validation Summary: How to Enable Wayland on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Wayland display server protocol
- X11 / Xorg
- GNOME / Mutter compositor
- GDM (GNOME Display Manager) configuration
- NVIDIA proprietary drivers (DRM KMS, initramfs, GRUB)
- XWayland compatibility layer
- PipeWire and xdg-desktop-portal (screen sharing)
- Screen capture/recording tools (OBS, wf-recorder, grim, slurp, gnome-screenshot)
- Remote desktop (GNOME RDP, wayvnc, waypipe)
- Environment variables for toolkits (GDK_BACKEND, QT_QPA_PLATFORM, MOZ_ENABLE_WAYLAND, Ozone/Electron flags)
- gsettings / dconf

## Sources Consulted
- Wayland project documentation — https://wayland.freedesktop.org/
- GNOME / GDM documentation and the shipped `61-gdm.rules` udev rules (`/usr/lib/udev/rules.d/61-gdm.rules`)
- NVIDIA Linux driver docs on `nvidia-drm.modeset` and DRM KMS — https://download.nvidia.com/XFree86/Linux-x86_64/ (README, Direct Rendering Manager Kernel Modesetting)
- wlroots tooling docs/man pages: grim, slurp, wf-recorder, wlr-randr (all depend on wlr-* protocols)
- Mutter protocol support (lacks wlr-screencopy / wlr-layer-shell / wlr-output-management)
- OBS Studio packaging (executable name `obs`) — https://obsproject.com/
- Chromium/Electron Ozone platform flags and `chromium-flags.conf` / `*-flags.conf` config files
- GNOME release notes for the screenshot/screencast UI rewrite in GNOME 42 (removal of the 30s screencast limit and `max-screencast-length` key)
- man pages: loginctl, xprop, xlsclients, xdotool, gsettings, update-grub, update-initramfs

## Issues Found
1. **`mkdir -p ~/.config/chromium-flags.conf`** — `chromium-flags.conf` is a file, not a directory. This command created a directory at that path, which would cause the following `echo ... >>` appends to fail. Changed to `mkdir -p ~/.config` (parent directory only) with a clarifying comment.
2. **`QT_QPA_PLATFORM=xcb obs-studio`** — The OBS Studio executable is `obs`; `obs-studio` is only the package name, so the command would be "command not found". Changed to `obs` with a clarifying note.
3. **wlroots-only tools presented as GNOME solutions** — `wlr-randr`, `wf-recorder`, `grim`, and `slurp` depend on the `wlr-output-management`, `wlr-screencopy`, and `wlr-layer-shell` protocols, which GNOME's Mutter compositor (the Ubuntu default) does not implement, so they fail on a stock Ubuntu GNOME Wayland session. Added caveats pointing GNOME users to Settings > Displays, OBS (PipeWire), gnome-screenshot, and the built-in recorder.
4. **`gnome-randr`** — Not a built-in or packaged Ubuntu command (it is an unofficial third-party script); `xrandr` is X11-only. Replaced the bare command with a note to use Settings > Displays.
5. **Outdated 30-second screencast limit / `max-screencast-length`** — That gsettings key and the 30s limit applied to older GNOME (3.x). GNOME 42+ (Ubuntu 22.04 onward) rewrote the recorder, removed the limit, and dropped the key. Added a version caveat instead of presenting it as currently applicable.
6. **Summary table** recommended `wf-recorder` for screen recording (incompatible with GNOME). Changed to OBS with PipeWire or GNOME's built-in recorder.
7. **Illustrative GDM udev rule** stated the NVIDIA rule sets `PreferredDisplayServer xorg`; the actual `61-gdm.rules` directive uses `WaylandEnable false`. Corrected the example.
8. **`xprop | grep -i wayland`** — Not a valid detection method: xprop can only select X11/XWayland windows (native Wayland windows are invisible to it) and emits no "wayland" property, so the grep always returns nothing. Replaced with `xprop` plus an accurate explanation (selectable = XWayland).
9. **Mismatched comment** told readers to "Install wlr-protocols" while the command installs `wayland-utils`. Corrected the comment.

## Review Notes
- Core procedure (editing `/etc/gdm3/custom.conf` `[daemon] WaylandEnable=`, restarting `gdm3`, selecting the session via the login-screen gear, NVIDIA `nvidia-drm.modeset=1` + initramfs modules + checking `/sys/module/nvidia_drm/parameters/modeset`) is accurate and current.
- Display-server checks (`echo $XDG_SESSION_TYPE`, `loginctl show-session ... -p Type`), the gsettings remote-desktop schema (`org.gnome.desktop.remote-desktop.rdp`), fractional-scaling experimental feature (`scale-monitor-framebuffer`), PipeWire/portal package set, and waypipe/wayvnc usage are all correct.
- "Firefox native since version 98" and "LibreOffice native since 7.x" are approximate framing rather than precise milestones; left as-is since they are not materially wrong (Firefox defaulted to Wayland on Linux in v121; the env var `MOZ_ENABLE_WAYLAND=1` shown still works for forcing it earlier).
- The NVIDIA "version 470 or newer" guidance is reasonable (470 introduced the GBM backend needed for GNOME Wayland); very modern setups generally want 535+ for best results, but the stated minimum is not incorrect.
- The X11-vs-Wayland architecture diagram is a simplification (in X11 the compositor and X server interact bidirectionally) but is acceptable as a conceptual overview.
