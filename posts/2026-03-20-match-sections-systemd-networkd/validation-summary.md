# Validation Summary: How to Use Match Sections to Target Specific Interfaces in systemd-networkd

## Status
validated

## Post Type
Guide

## Technologies Covered
- `systemd-networkd`
- `systemd-udevd`
- `.network` files
- `.link` files
- `networkctl`
- `udevadm`
- Linux networking

## Sources Consulted
- `systemd.network(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `systemd.link(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.link.html
- `networkctl(1)`: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `systemd.unit(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html

## Issues Found
- The post used `Name=` generically for both `.network` and `.link` files. I clarified that `.network` files use `Name=` while `.link` files use `OriginalName=` because `.link` matching happens before userspace renames.
- The post used `Type=vlan` and `Type=bond`, but current `systemd` documentation distinguishes device `Type=` from interface `Kind=`. I corrected the examples to use `Kind=vlan` and `Kind=bond`, and kept `Type=` examples to valid device types such as `ether` and `wlan`.
- The combined match example used `MACAddress=aa:bb:cc:*:*:*`, but `MACAddress=` does not accept shell globs. I replaced it with an exact MAC address.
- The precedence section said matching `.network` files are merged. Current `systemd.network(5)` states the first matching `.network` file is applied and later matches are ignored. I corrected that behavior and noted that drop-in `.d/*.conf` files are what get merged.
- The command `networkd-manager --test-match=eth0` is not a documented user-facing command. I replaced it with the documented `.link` debugging command `sudo SYSTEMD_LOG_LEVEL=debug udevadm test-builtin net_setup_link /sys/class/net/eth0` and updated the `networkctl status` example to show both `Link File` and `Network File`.

## Review Notes
- `Kind=` matching is available in newer `systemd` releases and is documented as added in version 251. Readers on older distributions may need alternate match criteria.
- `.link` files are applied by `systemd-udevd`, not by `systemd-networkd` itself, though they are commonly used together.
