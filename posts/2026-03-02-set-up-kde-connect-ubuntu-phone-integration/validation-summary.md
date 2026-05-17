# Validation Summary: How to Set Up KDE Connect on Ubuntu for Phone Integration

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- KDE Connect (desktop daemon and CLI: `kdeconnectd`, `kdeconnect-cli`, `kdeconnect-app`, `kdeconnect-settings`, `kdeconnect-indicator`)
- KDE Connect Android app (F-Droid / Google Play)
- Ubuntu / APT package management (`kdeconnect`, `kubuntu-ppa/backports` PPA)
- GSConnect (GNOME Shell extension `gnome-shell-extension-gsconnect`)
- UFW firewall (TCP/UDP port range 1714–1764)
- XDG autostart `.desktop` files
- SFTP / FUSE mounting (`$XDG_RUNTIME_DIR/<device_id>/`)
- PulseAudio `pactl`, `xdg-screensaver`, `systemctl suspend`, `xdg-open`

## Sources Consulted
- KDE Connect CLI source: https://invent.kde.org/network/kdeconnect-kde/-/raw/master/cli/kdeconnect-cli.cpp
- KDE Connect SFTP plugin source: https://invent.kde.org/network/kdeconnect-kde/-/raw/master/plugins/sftp/sftpplugin.cpp
- Ubuntu 22.04 (jammy) `kdeconnect` package file list: https://packages.ubuntu.com/jammy/amd64/kdeconnect/filelist
- KDE Connect user documentation: https://userbase.kde.org/KDEConnect

## Issues Found

1. **Incorrect daemon binary path.** The post used `/usr/lib/kdeconnect/kdeconnectd`, but on Ubuntu (verified against the Ubuntu 22.04 `kdeconnect` package file list) the daemon lives at `/usr/lib/x86_64-linux-gnu/libexec/kdeconnectd`. Fixed in three places: the Pairing Devices section, the Troubleshooting "Pairing fails" tip, and the autostart `.desktop` Exec line.

2. **Non-existent `--send-notification` flag.** The CLI example used `kdeconnect-cli --device DEVICE_ID --send-notification "Hello from Ubuntu"`, but `--send-notification` is not a valid option of `kdeconnect-cli` (verified against upstream source). Replaced with `--ping-msg "Hello from Ubuntu"`, which is the actual flag for sending a custom-text notification/ping to the remote device, and updated the comment accordingly.

3. **Wrong SFTP mount path.** The post stated phone files appear at `~/.local/share/kdeconnect/DEVICE_ID/`. Per the current SFTP plugin source, the mount point is `QStandardPaths::RuntimeLocation` (i.e. `$XDG_RUNTIME_DIR`, typically `/run/user/$UID/`) joined with the device ID. Updated the comment to `$XDG_RUNTIME_DIR (typically /run/user/$UID/DEVICE_ID/)`.

## Review Notes
- The firewall comment simplifies things slightly ("TCP port 1716 for connection and UDP 1716 for device discovery"); in practice KDE Connect can use any port in the 1714–1764 range, but the `ufw` rules opening the full range are correct, so the practical guidance still works.
- The autostart entry uses `X-KDE-autostart-after=panel`, which is a KDE-specific hint. On GNOME or other DEs it is harmless but ignored. KDE Connect is also normally D-Bus activated, so manual autostart is usually unnecessary — but adding it doesn't cause harm.
- All other CLI flags (`--list-devices`, `-l`, `--share`, `--ping`, `--ring`, `--lock`, `--list-commands`, `--execute-command`) were verified to exist in upstream `kdeconnect-cli`.
- Package names (`kdeconnect`, `gnome-shell-extension-gsconnect`) and the `kubuntu-ppa/backports` PPA were verified as accurate.
- `kdeconnect-settings` is shipped as a binary in the Ubuntu package, so the reference to it is valid.
