# Validation Summary: How to Install MATE Desktop on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MATE Desktop Environment (Marco window manager, Caja file manager, mate-applets, etc.)
- Ubuntu (apt package management)
- LightDM display manager (and gdm3 reference)
- gsettings / dconf configuration
- TigerVNC remote desktop
- systemd service management
- AccountsService (default session selection)
- MATE applications: pluma, eom, atril, engrampa, mate-terminal, mate-calc, mate-utils

## Sources Consulted
- packages.ubuntu.com (noble) filelists for `mate-utils`, `network-manager-gnome`, `eom`, `pluma`, etc.
- MATE Desktop GitHub: https://github.com/mate-desktop/atril (atril is MATE's evince fork)
- mate-settings-daemon schema: https://github.com/mate-desktop/mate-settings-daemon/blob/master/data/org.mate.SettingsDaemon.plugins.media-keys.gschema.xml.in
- Marco source confirming `compositing-manager` / `reduced-resources` keys: https://github.com/mate-desktop/marco
- Ubuntu MATE Community: dconf custom keybindings — https://ubuntu-mate.community/t/how-to-add-custom-keybindings-using-gsettings/15941
- Ubuntu LightDM wiki: https://wiki.ubuntu.com/LightDM
- Launchpad bug 823718 — ~/.dmrc replaced by AccountsService: https://bugs.launchpad.net/ubuntu/+source/lightdm/+bug/823718
- TigerVNC documentation (tigervnc-standalone-server, vncpasswd, xstartup format)

## Issues Found
1. **Document viewer listed as `evince`** — evince is GNOME's document viewer. MATE ships its own fork, `atril`. Replaced `evince` with `atril` in the additional MATE applications section (with a comment noting it is the MATE fork of evince).

2. **Incorrect gsettings schema for custom keybinding** — `org.mate.keybindings.media-keys` is not a valid GSettings schema. Custom keybindings in MATE live under the relocatable schema at `/org/mate/desktop/keybindings/customN/` with three keys (`name`, `binding`, `action`). Replaced the single `gsettings set` line with three `dconf write` commands that follow the documented approach.

3. **Deprecated `~/.dmrc` for default session** — Modern Ubuntu LightDM uses AccountsService, and `~/.dmrc` is ignored when AccountsService is running (the default on Ubuntu). Replaced the `~/.dmrc` snippet with a write to `/var/lib/AccountsService/users/$USER` using the correct `[User]` / `XSession=mate` keys.

## Review Notes
- The `network-manager-gnome` package is correct for Ubuntu 24.04 LTS (noble) — it provides `/usr/bin/nm-applet`. In Ubuntu 25.10+ it becomes a transitional package and the canonical name is `network-manager-applet`. Worth flagging if/when this post is updated for a newer Ubuntu release, but the current package name still works via the transitional dependency.
- `mate-utils` correctly bundles `mate-screenshot` (and `mate-dictionary`, `mate-disk-usage-analyzer`, etc.); there is no standalone `mate-screenshot` package, so the existing inline comment is accurate.
- Marco flags (`--replace --no-composite`) and the `org.mate.Marco.general` schema keys (`compositing-manager`, `reduced-resources`) are valid.
- LightDM configuration syntax (`[Seat:*]` with `user-session=mate`) under `/etc/lightdm/lightdm.conf.d/` is correct.
- TigerVNC commands and the xstartup pattern (`exec mate-session`) are accurate.
- Some listed keyboard shortcuts (e.g., `Super+E`, `Ctrl+Alt+T`) are not default MATE bindings out of the box; the post already qualifies `Ctrl+Alt+T` with "(if configured)", which is appropriate.
