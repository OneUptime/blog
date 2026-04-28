# Validation Summary: How to Create a .network File for systemd-networkd

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- systemd-networkd
- `.network` configuration files
- `networkctl` CLI
- `ip` (iproute2)
- VLAN configuration on Linux
- DHCP / static IP / IPv6 RA / link-local addressing

## Sources Consulted
- systemd.network(5) man page (https://man.archlinux.org/man/systemd.network.5)
- systemd-networkd documentation for [Match], [Network], [Address], [Route] sections
- networkctl(1) man page

## Issues Found
No technical issues found.

All verified claims:
- `/etc/systemd/network/` is the correct configuration location.
- Files are processed in alphanumeric/lexicographical order; numeric prefixes control priority. The first matching `.network` file applies — lower numbers = higher priority.
- `[Match]` keys `Name=`, `MACAddress=`, `Type=` (e.g., `ether`), and `Driver=` are valid.
- `[Network]` keys `Address=`, `Gateway=`, `DNS=`, `DHCP=ipv4` (accepts `yes|no|ipv4|ipv6`), `LinkLocalAddressing=no`, `IPv6AcceptRA=no`, and `VLAN=` are all valid.
- `[Address]` section supports `Address=` and `Label=` (1–15 ASCII chars; label format like `eth0:1` is conventional).
- `[Route]` section keys `Destination=`, `Gateway=`, `Metric=` are valid.
- `networkctl reload`, `networkctl status <iface>`, and `ip addr show <iface>` are correct commands.
- VLAN= references a VLAN netdev defined elsewhere (in a `.netdev` file); syntax is correct.

## Review Notes
- The `VLAN=eth0.10` example in the post correctly references a VLAN netdev by name; readers will need a corresponding `.netdev` file (with `[NetDev]` Kind=vlan and `[VLAN]` Id=10) for the VLAN to actually be created. This is standard for systemd-networkd VLAN setups but is not shown in this post.
- Per systemd docs, user configuration files in `/etc/systemd/network/` should ideally use prefixes below `70-` to avoid conflicts with vendor/distro defaults; the post's choices (10–40) are fine.
- `networkctl reload` was added in systemd 244; on much older systems users would need `systemctl restart systemd-networkd`. Not worth calling out as an error since modern distros ship newer systemd.
