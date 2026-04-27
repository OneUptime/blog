# Validation Summary: How to Configure OSPFv3 on Linux with FRRouting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- FRRouting (FRR) — `ospf6d` daemon
- OSPFv3 (IPv6 routing protocol, RFC 5340)
- Linux (Debian/Ubuntu, RHEL/CentOS/Fedora)
- IPv6 forwarding (sysctl)
- vtysh (FRR integrated shell)

## Sources Consulted
- FRR OSPFv3 documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- FRR `ospf6d.rst` source: https://github.com/FRRouting/frr/blob/master/doc/user/ospf6d.rst
- FRR daemons file template: https://github.com/FRRouting/frr/blob/master/tools/etc/frr/daemons
- FRR `ospf6_neighbor.c` source (output format): https://github.com/FRRouting/frr/blob/master/ospf6d/ospf6_neighbor.c
- RFC 5340 — OSPF for IPv6

## Issues Found

1. **Verification commands used `ospf` instead of `ospf6` prefix.** FRR's OSPFv3 show commands all use the `ospf6` suffix (e.g., `show ipv6 ospf6 neighbor`, not `show ipv6 ospf neighbor`). The post used the IPv4-style `show ipv6 ospf ...` form throughout the Verification Commands section, which is not valid in FRR. Fixed all five commands: `show ipv6 ospf neighbor`, `show ipv6 ospf interface`, `show ipv6 ospf database`, `show ipv6 ospf route`, and `show ipv6 route ospf` → corresponding `ospf6` forms.

2. **Sample Output used Cisco IOS format, not FRR format.** The original sample showed `show ipv6 ospf neighbor` (wrong command), an `OSPFv3 Process (1)` header line (Cisco-only — FRR has no process IDs in OSPFv3), and an `IfState` column populated with neighbor IPv6 addresses (FRR's column is `State/IfState` combined, with a `Duration` column instead of an address). Replaced with the actual FRR header layout (`Neighbor ID  Pri  DeadTime  State/IfState  Duration  I/F[State]`) per the printf in `ospf6_neighbor.c`, and used `Full/PointToPoint` and `eth1[PointToPoint]` rather than the non-FRR `Full/  -` / `eth1[P2P]` notation.

3. **Summary section** referenced the same incorrect `show ipv6 ospf neighbor` and `show ipv6 route ospf` commands. Updated both to the `ospf6` forms to match the corrected Verification Commands section.

## Review Notes
- Configuration commands (`router ospf6`, `ospf6 router-id`, `ipv6 ospf6 area`, `ipv6 ospf6 passive`, `ipv6 ospf6 hello-interval/dead-interval/cost`) are all verified against the FRR `ospf6d` documentation.
- `/etc/frr/daemons` with the `ospf6d=no` default line is correct for current FRR; the `sed` enable-line will work as written.
- `redistribute static` and `redistribute static route-map <NAME>` syntax under `router ospf6` is valid FRR.
- The `ospf6 router-id` command syntax is FRR-specific (Cisco/Junos use plain `router-id`); the post correctly uses the FRR form.
- Minor stylistic note (not changed): the post uses both `vtysh`-interactive and `ospf6d.conf`-file methods. In production, FRR's `frr.conf` integrated config (with `service integrated-vtysh-config`) is more common than per-daemon files, but both methods remain supported.
