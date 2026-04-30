# Validation Summary: How to Fix Network Unreachable Route Errors on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux routing and `iproute2`
- `systemd-networkd`
- NetworkManager (`nmcli`)
- Debian/Ubuntu `ifupdown` and `/etc/network/interfaces`
- Legacy RHEL/CentOS `network-scripts`

## Sources Consulted
- `ip-route(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `systemd.network(5)`: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- NetworkManager settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Debian `interfaces(5)` man page: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Red Hat Enterprise Linux 7 Networking Guide, configuring static routes in `ifcfg` files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-configuring_static_routes_in_ifcfg_files
- Red Hat Enterprise Linux 8.8 Release Notes, deprecated networking functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/8.8_release_notes/deprecated-functionality

## Issues Found
- The VPN split-tunnel example was incorrect. The original `0.0.0.0/1` and `128.0.0.0/1` routes would send almost all IPv4 traffic through the VPN, which contradicted the claim that the original default route remained in use for non-VPN traffic. I replaced it with an example that restores the original default route and adds a specific VPN subnet route.
- The best-practices advice to use `ip route show cache` was outdated. Modern Linux kernels no longer expose the IPv4 routing cache in the way the post implied, so I replaced that guidance with a note to use `ip route get` instead.
- The `/etc/sysconfig/network-scripts/` persistence section needed version scope. I marked it as a legacy approach for RHEL/CentOS 7-era systems because Red Hat deprecated network-scripts in RHEL 8 and they are no longer the default path on current Red Hat-based systems.
- The opening explanation was slightly overbroad. I changed references to "no route" to "no usable route" and clarified the missing-default-route note so it does not imply that every off-subnet destination fails when more specific routes exist.

## Review Notes
- The `ip route`, `ip route get`, `systemd-networkd`, NetworkManager, and `ifupdown` examples are syntactically valid after the fixes.
- The post still includes both current and legacy persistence mechanisms. That is acceptable now that the legacy Red Hat path is explicitly scoped, but a future refresh could prefer NetworkManager-centric examples for newer RHEL/CentOS environments.
