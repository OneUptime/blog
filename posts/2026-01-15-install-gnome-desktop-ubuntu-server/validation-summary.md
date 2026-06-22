# Validation Summary: How to Install GNOME Desktop on Ubuntu Server

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu Server (apt package management)
- GNOME desktop environment (GNOME Shell, Nautilus, GNOME Control Center)
- GDM3 (GNOME Display Manager)
- systemd (targets, units, `systemctl`)
- GNOME Shell extensions and `gnome-extensions` CLI
- `gsettings` / dconf configuration
- Wayland vs X11
- Remote desktop: GNOME Remote Desktop (RDP), TigerVNC, xRDP
- UFW firewall, SSH tunneling

## Sources Consulted
- Ubuntu package archive — vanilla-gnome-desktop (noble): https://packages.ubuntu.com/noble/vanilla-gnome-desktop
- Ubuntu package archive — chrome-gnome-shell (noble, transitional): https://packages.ubuntu.com/noble/chrome-gnome-shell
- GNOME browser integration installation guide: https://gnome.pages.gitlab.gnome.org/gnome-browser-integration/pages/installation-guide.html
- Ubuntu Launchpad — chrome-gnome-shell renamed to gnome-browser-connector: https://answers.launchpad.net/ubuntu/+source/chrome-gnome-shell/+question/703596
- Ubuntu package archive — gnome-shell-extension-appindicator (noble): https://www.ubuntuupdates.org/package/core/noble/main/updates/gnome-shell-extension-appindicator
- GNOME Shell extensions / system-monitor extension references (extensions.gnome.org, OMG! Ubuntu)
- Bash manual (line continuation / comment behavior) for the multi-line `apt install` issue

## Issues Found
1. **Broken multi-line `apt install` commands (real bash bug).** Three code blocks placed inline `# ...` comments after a `\` line-continuation, e.g.:
   ```bash
   sudo apt install -y \
       nautilus \              # File manager
       gnome-terminal \        # Terminal emulator
   ```
   A backslash followed by trailing spaces escapes the *space*, not the newline, so the line continuation is broken and the command terminates early — subsequent package lines run as standalone commands. Fixed in all three blocks (Option 4 custom setup, additional utilities, and Recommended Server Extensions) by moving the per-package descriptions into comment lines above the command and keeping clean `\` continuations.

2. **Outdated package name `chrome-gnome-shell`.** On Ubuntu 23.04+ this was renamed to `gnome-browser-connector`; `chrome-gnome-shell` is now only a transitional package. Updated the install command to `gnome-browser-connector` and added a note explaining the rename.

3. **Incorrect comment on `dash-to-dock show-mounts`.** The comment claimed the setting "Disable desktop icons (GNOME 40+)", but `org.gnome.shell.extensions.dash-to-dock show-mounts` controls whether mounted volumes appear in the dock — unrelated to desktop icons. Corrected the comment to describe the actual behavior.

## Review Notes
- **Tracker service names are Tracker 2 era.** The optimization script masks `tracker-store.service`, `tracker-miner-fs.service`, `tracker-miner-rss.service`, `tracker-extract.service`, `tracker-miner-apps.service`, `tracker-writeback.service`. Ubuntu 22.04+ ships Tracker 3, whose user units are named differently (e.g. `tracker-miner-fs-3.service`, `tracker-extract-3.service`, `tracker-xdg-portal-3.service`). Masking the old names is harmless (it just creates `/dev/null` symlinks) but no longer disables indexing on current releases. Left as-is to avoid introducing version-specific names that vary by release, but readers on 22.04+ should adjust the unit names.
- `vanilla-gnome-desktop` was verified to still exist in Ubuntu 24.04 (noble, universe) — valid as written.
- Extension packages `gnome-shell-extension-system-monitor`, `gnome-shell-extension-dash-to-panel`, `gnome-shell-extension-appindicator`, and `gnome-shell-extension-manager` all exist in current Ubuntu repositories.
- `gsettings` schema keys used (`org.gnome.desktop.interface`, `org.gnome.mutter`, `org.gnome.nautilus.preferences`, `org.gnome.software`, `org.gnome.desktop.remote-desktop.rdp`) are valid.
- Minor (non-technical) formatting nit not changed: the "Resource Usage Considerations" line is missing its `##` heading marker, so it renders as body text rather than a section heading. Left alone as it is a stylistic/formatting issue, not a technical error.
- The TTY shortcut mapping (Ctrl+Alt+F1 = GDM greeter, F2 = session, F3–F6 = TTYs) is accurate for modern Ubuntu GDM/Wayland layouts.
- Disk/RAM usage figures in the comparison table are reasonable approximations, appropriately hedged with "~".
