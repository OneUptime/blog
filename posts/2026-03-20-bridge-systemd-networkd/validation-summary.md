# Validation Summary: How to Configure a Bridge with systemd-networkd

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux
- systemd-networkd
- Linux bridge networking
- `networkctl`
- iproute2 `bridge` command

## Sources Consulted
- systemd `systemd.network(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- systemd `systemd.netdev(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd `networkctl(1)`: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- Linux kernel bridge documentation: https://docs.kernel.org/next/networking/bridge.html
- Local `ip-link(8)` and `bridge(8)` man pages / CLI help output

## Issues Found
- The first bridge example set `ForwardDelaySec=0` while STP was disabled. Current Linux bridge documentation and `ip-link(8)` indicate forwarding delay is only relevant when STP is enabled, and valid values are 2-30 seconds. I removed that line and adjusted the surrounding comment to keep the example valid.
- The DHCP example used a `[DHCP]` section with `DHCP=ipv4`. Current `systemd.network(5)` documents protocol-specific DHCP sections, so I changed it to `[DHCPv4]` to match current `systemd-networkd` syntax.

## Review Notes
- The static bridge example, `Bridge=br0` port configuration, `Gateway=`, `DNS=`, and verification commands are consistent with current `systemd.network(5)`, `systemd.netdev(5)`, and `bridge(8)` documentation.
- The guide assumes `systemd-networkd` is the active network manager for the host and that no competing tool or other matching `.network` file is already managing the same interfaces.
