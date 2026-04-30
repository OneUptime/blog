# Validation Summary: How to Configure a Floating Static Route as a Backup Path

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `iproute2`
- `systemd-networkd`
- FRRouting (FRR)
- OSPF
- IPv4 static routing

## Sources Consulted
- `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ip-monitor(8)` manual: https://man7.org/linux/man-pages/man8/ip-monitor.8.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `systemd.network(5)` documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- FRR Zebra documentation: https://docs.frrouting.org/en/stable-10.2/zebra.html
- FRR STATIC documentation: https://docs.frrouting.org/en/stable-9.0/static.html

## Issues Found
- The introduction treated Linux route metrics and administrative distance as interchangeable. I corrected the wording so the Linux examples use metrics, while FRR-style routing stacks are described in terms of administrative distance.
- The failover simulation used `ip link set eth0 down` and implied Linux would automatically stop preferring the primary route. The kernel documentation shows `ignore_routes_with_linkdown` defaults to `0`, so I changed the example to simulate failover by withdrawing and restoring the primary route directly.
- The FRR/OSPF section incorrectly used a Linux kernel route metric as the mechanism for floating behind OSPF. I replaced it with an FRR static-route example that uses a higher administrative distance than OSPF's default distance.

## Review Notes
- The `systemd-networkd` route snippets are technically valid as written.
- Automatic failover on link events in Linux depends on how routes are managed and whether link-down routes are ignored or withdrawn by user space.
