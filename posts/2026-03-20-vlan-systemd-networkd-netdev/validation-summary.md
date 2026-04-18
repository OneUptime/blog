# Validation Summary: How to Configure VLANs with systemd-networkd and .netdev Files

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- systemd-networkd
- Linux networking
- VLAN (IEEE 802.1Q)
- `.netdev` unit files
- `.network` unit files
- `networkctl`
- `ip` command (iproute2)

## Sources Consulted
- systemd.netdev(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- systemd.network(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.network.html
- networkctl(1) man page — https://www.freedesktop.org/software/systemd/man/networkctl.html
- systemd-networkd(8) man page — https://www.freedesktop.org/software/systemd/man/systemd-networkd.html
- IEEE 802.1Q VLAN standard

## Issues Found
No technical issues found.

The configuration syntax is accurate:
- `[NetDev]` section with `Name=` and `Kind=vlan` is correct per systemd.netdev(5).
- `[VLAN]` section with `Id=` is the correct directive for the VLAN ID (valid range 0–4094).
- `VLAN=` directive in `[Network]` section is the correct way to attach VLAN interfaces to a parent interface.
- `DHCP=ipv4` is a valid value (alongside `yes`, `no`, `ipv6`).
- File naming convention (`/etc/systemd/network/` with numeric prefixes for ordering) follows systemd conventions.
- `systemctl restart systemd-networkd` and `networkctl status` commands are accurate.
- `ip link show` and `ip -4 addr show` are valid iproute2 commands.

## Review Notes
- The post could optionally mention `networkctl reload` as a lighter-weight alternative to `systemctl restart systemd-networkd` (available in newer systemd versions), but the restart approach shown is valid and works universally.
- The author could note that `Gateway=` inside `[Network]` is generally fine, but per-interface gateways may also be configured via `[Route]` sections with more control — however, the simpler approach shown is correct.
- The DHCP section at the end is brief — it correctly shows the directive but assumes the reader can infer where it goes (inside the VLAN's `.network` file `[Network]` section).
