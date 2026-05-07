# Validation Summary: How to Add a Static Route for an IPv4 Subnet on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IPv4 routing
- `iproute2` / `ip route`
- Netplan
- Debian `ifupdown`
- NetworkManager / `nmcli`

## Sources Consulted
- `ip-route(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- NetworkManager Reference Manual (`nm-settings-nmcli`): https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Debian `interfaces(5)` manual page: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- Local `nmcli connection modify help` output for `+ipv4.routes` syntax
- Local `man ip-route` output for `ip route get`, multipath `nexthop`, and route metric behavior

## Issues Found
- The verification comment for `ip route get 10.10.5.1` described it as a reachability test. I changed it to say that it shows which route the kernel will use, because `ip route get` performs a routing lookup rather than an end-to-end connectivity test.
- The backup-route metric comment implied simple automatic failover when the primary route is "gone." I changed it to say the higher-metric route is preferred only when the lower-metric route is unavailable, which is a more accurate description of metric-based route selection.

## Review Notes
- The command and configuration syntax in the post is current for modern Linux systems using `iproute2`, Netplan, Debian `ifupdown`, and NetworkManager.
- The persistence examples are valid distro-specific approaches, but the exact interface name and profile name will vary by system.
