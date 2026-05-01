# Validation Summary: How to Enable and Start systemd-networkd on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `systemd-networkd`
- `systemd-resolved`
- `systemctl`
- `networkctl`
- `.network` and `.netdev` configuration files
- `iproute2` (`ip`)

## Sources Consulted
- systemd `systemctl(1)` man page: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd `networkctl(1)` man page: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- systemd `systemd-networkd.service(8)` man page: https://www.freedesktop.org/software/systemd/man/systemd-networkd.service.html
- systemd `systemd.network(5)` man page: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- systemd `systemd-resolved.service(8)` documentation: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- Local `systemctl --help`, `networkctl --help`, and installed systemd man pages from the workspace environment (systemd 255)

## Issues Found
- The introduction and conclusion implied that `systemd-networkd` reads configuration from `/etc/systemd/network/` as though that were the sole configuration source. I corrected the wording to say it reads `.network` and `.netdev` files and that `/etc/systemd/network/` is the typical local administration location. This matches the official systemd documentation, which documents multiple configuration search paths.
- No other technical issues found after validating the commands, sample `.network` file, `networkctl reload` behavior, and the `systemd-resolved` `/etc/resolv.conf` symlink guidance.

## Review Notes
- The `ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf` example is valid and matches one of systemd-resolved's supported modes; upstream describes this stub-resolver symlink mode as the recommended one.
- Disabling or masking NetworkManager on a remote or actively used system can interrupt connectivity if equivalent `systemd-networkd` configuration is not already in place. The commands are correct, but this remains an operational caveat for readers.
