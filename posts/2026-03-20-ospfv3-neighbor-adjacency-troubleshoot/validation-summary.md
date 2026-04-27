# Validation Summary: How to Troubleshoot OSPFv3 Neighbor Adjacency Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OSPFv3 (RFC 5340)
- IPv6
- FRRouting (ospf6d daemon, vtysh)
- Cisco IOS (OSPFv3)
- Linux iproute2 (`ip -6 addr`, `ip -6 maddr`, `ip link`)
- ip6tables
- tcpdump

## Sources Consulted
- RFC 5340 (OSPF for IPv6) — https://datatracker.ietf.org/doc/html/rfc5340
- RFC 2328 (OSPF Version 2) — adjacency state machine reused by OSPFv3
- FRRouting ospf6d documentation — https://docs.frrouting.org/en/latest/ospf6d.html
- IANA IPv6 Multicast Address assignments (ff02::5 / ff02::6)
- IANA Protocol Numbers (89 = OSPFIGP)
- Linux `ip(8)` / `ip6tables(8)` / `tcpdump(8)` man pages

## Issues Found

1. **Incorrect FRRouting CLI command (3 occurrences).** The post used `show ipv6 ospf neighbor` and `show ipv6 ospf interface eth0`. The canonical FRR vtysh commands for the OSPFv3 daemon (`ospf6d`) use the `ospf6` keyword, not `ospf`. Fixed to `show ipv6 ospf6 neighbor` and `show ipv6 ospf6 interface eth0` in Step 1, Step 2 (Stuck in Init), and Step 7.

2. **Inaccurate description of DR/BDR adjacency behavior.** The original text "only DR and BDR form Full adjacency with each other. Others stay at 2-Way" is misleading — DR and BDR form Full adjacency with all routers on the segment (including DROTHERs); only DROTHER-to-DROTHER pairs stay at 2-Way. Reworded to: "DROTHER routers form Full adjacency only with the DR and BDR. Two DROTHER routers stay at 2-Way with each other."

## Review Notes

- The state machine diagram intentionally omits the `Attempt` state, which only applies to NBMA networks. This is fine for a broadcast/p2p-focused troubleshooting guide.
- OSPFv3 multicast addresses (ff02::5 / ff02::6), IP protocol 89, link-local source requirement, and MTU-mismatch ExStart symptom are all consistent with RFC 5340.
- The `ipv6 ospf6 mtu-ignore` interface command is correct for FRR's ospf6d.
- The Cisco command `show ospfv3 neighbor` is correct for modern Cisco IOS / IOS-XE address-family OSPFv3 configurations.
- The `tcpdump` BPF filter `ip6 proto 89` is valid and matches OSPFv3 traffic.
- Adding a link-local address manually (`ip -6 addr add fe80::1/64 dev eth0 scope link`) is technically valid but unusual — most Linux interfaces auto-generate one when IPv6 is enabled. Worth keeping as a fallback diagnostic step.
