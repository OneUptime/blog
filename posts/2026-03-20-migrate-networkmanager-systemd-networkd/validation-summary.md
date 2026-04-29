# Validation Summary: How to Migrate from NetworkManager to systemd-networkd

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- NetworkManager (`nmcli`)
- systemd-networkd
- systemd-resolved (`resolvectl`)
- `networkctl`
- `systemctl` (service management, masking)
- `iproute2` (`ip addr`, `ip route`, `ip link`)
- systemd `.network` configuration files (INI format)
- DHCP / static IP configuration
- DNS stub resolver (`/run/systemd/resolve/stub-resolv.conf`)

## Sources Consulted
- `man systemd.network(5)` — confirmed `[Match]` / `[Network]` section structure, `Name=`, `Address=`, `Gateway=`, `DNS=`, and `DHCP=` keys, including the recommendation to prefix files with a number smaller than `70` (e.g. `10-eth0.network`).
- `man systemd-networkd(8)` and `man networkctl(1)` — confirmed `networkctl list` and `networkctl status` usage.
- `man systemd-resolved(8)` — confirmed `/run/systemd/resolve/stub-resolv.conf` is the recommended `/etc/resolv.conf` symlink target.
- `man resolvectl(1)` — confirmed `resolvectl query <hostname>` syntax.
- `man nmcli(1)` — confirmed `nmcli connection show` and `nmcli connection show <name>` usage.
- `man systemctl(1)` — confirmed `enable`, `disable`, `mask`, `unmask`, and `--now` semantics.

## Issues Found
No technical issues found. All commands, configuration keys, file paths, and section structures match official systemd / NetworkManager documentation.

## Review Notes
- The `.network` file format shown is correct: `Gateway=` is a valid short-hand inside `[Network]` (per `systemd.network(5)`, equivalent to a `[Route]` section with only `Gateway=`).
- `DHCP=ipv4` is a valid value (alongside `yes`, `no`, `ipv6`).
- The post's description mentions `.netdev` files but the body only covers `.network` files. `.netdev` files are for virtual devices (bridges, bonds, VLANs) and are out of scope for a basic migration; not a technical error, just a minor mismatch between description and content.
- For wireless interfaces, the post correctly notes that systemd-networkd does not handle WPA authentication itself and a separate `wpa_supplicant` configuration is required.
- The recommended numeric prefix `10-` on the example filename matches the man page guidance to use a prefix smaller than `70` so user-defined files take precedence over distro defaults.
- Masking `NetworkManager` with `systemctl mask` is correctly described as optional but recommended to prevent accidental re-activation.
