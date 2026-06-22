# Validation Summary: How to Install Flatpak on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Flatpak (package management)
- Flathub repository
- Ubuntu (apt)
- GNOME Software / KDE Plasma Discover plugins
- Flatseal (permissions GUI)

## Sources Consulted
- Flatpak Command Reference — https://docs.flatpak.org/en/latest/flatpak-command-reference.html
- flatpak-override(1) man page — https://www.man7.org/linux/man-pages/man1/flatpak-override.1.html
- flatpak-update(1) man page — https://www.man7.org/linux/man-pages/man1/flatpak-update.1.html
- Using Flatpak — https://docs.flatpak.org/en/latest/using-flatpak.html
- Flathub application listings (app IDs)

## Issues Found
No technical issues found.

All commands, flags, and options were verified against the official Flatpak documentation and man pages:
- `flatpak update --force-remove` — valid (removes old files even if in use by a running application).
- `flatpak override --reset` — valid (removes overrides for an app or globally).
- `flatpak override --device=all` — valid (`all` is an accepted DEVICE value alongside dri, input, usb, kvm, shm).
- `flatpak list --columns=name,size` and `--columns=name,application,version,branch,installation` — `size` and all listed columns are valid.
- `flatpak override --filesystem=home`, `--share=network`, `--env=GTK_THEME=...` — all valid subsystem/filesystem/env override forms.
- `flatpak repair`, `flatpak uninstall --unused`, `--delete-data`, `--all`, `flatpak info --show-permissions` — all valid.
- Flathub remote URL `https://flathub.org/repo/flathub.flatpakrepo` — correct.
- Package names `gnome-software-plugin-flatpak` and `plasma-discover-backend-flatpak` — correct.
- Application IDs verified against Flathub: `com.spotify.Client`, `org.gimp.GIMP`, `com.visualstudio.code`, `org.mozilla.firefox`, `com.google.Chrome`, `com.slack.Slack`, `com.discordapp.Discord`, `org.telegram.desktop`, `com.getpostman.Postman`, `com.sublimetext.three`, `org.videolan.VLC`, `com.obsproject.Studio`, `org.libreoffice.LibreOffice`, `md.obsidian.Obsidian`, `com.github.tchx84.Flatseal`, `org.gtk.Gtk3theme.Adwaita-dark` — all correct.

## Review Notes
- `com.sublimetext.three` is the Sublime Text 3 Flathub ID. It remains the valid/current Flathub ID, though Sublime Text 4 is the latest upstream release — worth noting as a potential future update but not an error.
- The Flatpak vs Snap comparison table is a fair high-level summary. The "Auto-updates: Via GNOME Software" entry is accurate in that Flatpak CLI does not auto-update by default; GNOME Software (or a timer) handles background updates.
- After running `sudo apt install flatpak`, the package version on older Ubuntu releases (18.04) may be quite dated; users wanting newer Flatpak features may consider the Flatpak PPA, but this is optional and not required for the tutorial to work.
