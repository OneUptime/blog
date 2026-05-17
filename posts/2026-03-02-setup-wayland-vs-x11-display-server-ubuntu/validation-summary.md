# Validation Summary: How to Set Up Wayland vs X11 Display Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (21.04 / 22.04 / 24.04)
- Wayland display protocol
- X11 / Xorg display server
- GDM3 (GNOME Display Manager)
- XWayland compatibility layer
- AccountsService session selection
- udev rules (61-gdm.rules)
- PipeWire + xdg-desktop-portal-gnome (screen sharing)
- GDK / Qt / SDL backend environment variables
- SSH X11 forwarding
- GNOME Remote Desktop (`grdctl`)
- Mutter / KWin / Sway / Weston compositors
- `wayland-utils` (`wayland-info`)

## Sources Consulted
- GNOME admin guide — Configure a user default session: https://help.gnome.org/admin/system-admin-guide/stable/session-user.html.en
- GDM upstream `61-gdm.rules.in` source (endlessm/gdm mirror): https://github.com/endlessm/gdm/blob/master/data/61-gdm.rules.in
- Ubuntu manpage for `grdctl`: https://manpages.ubuntu.com/manpages/resolute/man1/grdctl.1.html
- VS Code issue #134612 — `argv.json` flag format: https://github.com/microsoft/vscode/issues/134612
- Ubuntu version history (Wikipedia): https://en.wikipedia.org/wiki/Ubuntu_version_history
- OMG! Ubuntu — 21.04 default Wayland: https://www.omgubuntu.co.uk/2021/01/ubuntu-21-04-will-use-wayland-by-default
- Arch Wiki — Wayland (XWayland / wmctrl notes): https://wiki.archlinux.org/title/Wayland
- Freedesktop Wayland documentation: https://wayland.freedesktop.org/
- xdg-desktop-portal documentation: https://flatpak.github.io/xdg-desktop-portal/

## Issues Found
1. **Ubuntu Wayland default history was off by one release.** The post said "Ubuntu 22.04 made Wayland the default for systems with compatible graphics drivers." In reality, Ubuntu 21.04 first made Wayland default for non-NVIDIA systems, and 22.04 LTS extended the default to NVIDIA systems with recent proprietary drivers. Rewrote the intro paragraph to reflect this correctly.

2. **`~/.dmrc` is not honored by GDM3.** The post instructed users to write `~/.dmrc` to change the default session. GDM3 uses **AccountsService** (`/var/lib/AccountsService/users/<USER>`) for this — `.dmrc` is a legacy GNOME 2 mechanism. Replaced the `.dmrc` snippet with the correct AccountsService approach (`Session=ubuntu` for Wayland, `Session=ubuntu-xorg` for Xorg).

3. **Fabricated `GDM_FORCE_X11` udev environment variable.** The udev rule shown used `ENV{GDM_FORCE_X11}="1"`, which is not a real GDM mechanism. The actual upstream `/usr/lib/udev/rules.d/61-gdm.rules` uses `RUN+="/usr/libexec/gdm-runtime-config set daemon WaylandEnable false"`. Updated the example to use the real `gdm-runtime-config` invocation.

4. **`gnome-remote-desktop-ctl` does not exist.** The actual CLI tool shipped with GNOME Remote Desktop is `grdctl`. Replaced `gnome-remote-desktop-ctl status` with `grdctl status`.

5. **`echo "--enable-features=…" >> ~/.config/code/argv.json` would corrupt the file.** VS Code's `argv.json` is a JSON (JSONC) object, not a flat list of CLI flags — appending a raw `--flag=value` line breaks the JSON parser. Replaced the `echo` with an explanation of the JSON key/value format (`"enable-features": "WebRTCPipeWireCapturer"`) plus an inline `code --enable-features=...` launch example, and pointed at the "Preferences: Configure Runtime Arguments" command.

## Review Notes
- The `wmctrl -m 2>/dev/null || echo "wmctrl not working (likely Wayland)"` heuristic is a reasonable approximation but not strictly reliable — wmctrl can sometimes return partial data via XWayland. Left as-is since the surrounding text is exploratory.
- The `loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}')` one-liner is fragile (assumes a single session, depends on column ordering); `loginctl show-session $XDG_SESSION_ID` is cleaner. Not changed because the original still works in most cases.
- `--enable-features=WebRTCPipeWireCapturer` is the historically correct flag name, but recent Chromium/Electron releases enable PipeWire screen capture by default. Worth revisiting if this post is updated for Ubuntu 26.04+.
- GNOME Remote Desktop dropped built-in VNC support in newer GNOME releases (RDP is now the primary protocol); the VNC instructions may stop working on Ubuntu releases beyond 24.04. Worth a future caveat.
- `gnome-remote-desktop-ctl` was never an upstream binary; the rename is just a correction to `grdctl`.
