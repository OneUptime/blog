# Validation Summary: How to Configure the Primary Slave in Active-Backup Bonding

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bonding driver
- Active-backup network bonding
- Debian `ifupdown` and `/etc/network/interfaces`
- Linux sysfs bonding controls under `/sys/class/net/.../bonding`
- `systemd-networkd`
- NetworkManager and `nmcli`
- Bond status inspection via `/proc/net/bonding` and `ip link`

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- Debian `ifenslave` documentation for `bond-*` options in `/etc/network/interfaces`: https://sources.debian.org/src/ifenslave/2.14/debian/README.Debian/
- Debian `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- `systemd.netdev(5)` for `PrimaryReselectPolicy=`: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network(5)` for `Bond=` and `PrimarySlave=`: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- `systemd.syntax(7)` for systemd config-file comment syntax: https://www.freedesktop.org/software/systemd/man/247/systemd.syntax.html
- NetworkManager `nm-settings-nmcli(5)` for `bond.options`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `nmcli-examples(7)` for bond controller and port profiles: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli-examples.html

## Issues Found
- The `/etc/network/interfaces` snippet used end-of-line `#` comments on configuration lines. `interfaces(5)` does not support end-of-line comments, so I moved those comments onto separate lines to keep the example valid.
- The `systemd-networkd` snippet used an inline comment on `PrimarySlave=yes`. `systemd` config files only treat lines starting with `#` or `;` as comments, so I moved that note to its own comment line.
- The `systemd-networkd` example only attached `eth0` to `bond0`, which left the example without a backup interface. I added an `eth1.network` example so the active-backup bond actually includes a secondary slave.

## Review Notes
- The `nmcli connection modify bond0` example is valid for updating an existing bond profile. I also sanity-checked the option string with `nmcli --offline` locally.
- In a full `systemd-networkd` setup, IP addressing for `bond0` would usually live in a separate `bond0.network` file. The post’s systemd section is specifically focused on primary-slave selection and bond membership.
