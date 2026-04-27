# Validation Summary: How to Configure OSPFv3 Stub Areas for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OSPFv3 (RFC 5340)
- IPv6 routing
- Cisco IOS / IOS XE OSPFv3 configuration (unified `router ospfv3` model)
- FRRouting `ospf6d`
- Linux iproute2 (`ip -6 route`)

## Sources Consulted
- RFC 5340 — OSPF for IPv6
- FRRouting `ospf6d` source (`ospf6d/ospf6_area.c`, `ospf6d/ospf6_top.c`) — https://github.com/FRRouting/frr/blob/master/ospf6d/ospf6_area.c
- FRRouting OSPFv3 documentation — https://docs.frrouting.org/en/latest/ospf6d.html
- Cisco IOS XE OSPFv3 configuration guide — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/15-1sg/ip6-route-ospfv3.html
- Cisco OSPFv3 LSDB deep dive — https://community.cisco.com/t5/networking-blogs/ospfv3-lsdb-database-deep-dive/ba-p/4458817
- Linux iproute2 `/etc/iproute2/rt_protos` (proto `ospf` = 188)

## Issues Found

1. **FRRouting `area X default-cost` command does not exist in `ospf6d`.** The post claimed `area 0.0.0.1 default-cost 100` works in FRR for OSPFv3. Verified against the FRR source (`ospf6d/ospf6_area.c`, `ospf6d/ospf6_top.c`): only `ospfd` (OSPFv2) implements `area default-cost`; `ospf6d` exposes `area … stub`, `area … stub no-summary`, `area … nssa`, `area … range`, and a few filter/list commands — but not `default-cost`. Replaced the FRR snippet with a note explaining the limitation and suggesting interface-level cost (`ipv6 ospf6 cost`) on the ABR as the FRR workaround.

2. **FRR `show ipv6 ospf` is not the correct command for OSPFv3.** The post used `vtysh -c "show ipv6 ospf"` to verify the stub area. FRR's OSPFv3 daemon is `ospf6d`, and the show command is `show ipv6 ospf6` (verified via `DEFUN(show_ipv6_ospf6, …, "show ipv6 ospf6 …")` in `ospf6_top.c`). Fixed to `show ipv6 ospf6`.

3. **Cisco `show ospfv3 database summary` uses OSPFv2 terminology.** In OSPFv3 the equivalent of OSPFv2 Type 3 summary LSAs is the Inter-Area-Prefix-LSA, and the modern Cisco IOS keyword is `inter-area prefix`, not `summary`. More importantly, the comment indicated the goal was to "verify stub area flag," which is more directly accomplished with `show ospfv3` (which lists each area and includes the line "It is a stub area"). Replaced the command and updated the expected-output comment.

## Review Notes

- The post uses OSPFv2 LSA-type terminology ("Type 3", "Type 5") even though OSPFv3 (RFC 5340) renames these to Inter-Area-Prefix-LSA and AS-External-LSA respectively, and uses different LS Type values (e.g. 0x2003, 0x4005). This is common industry shorthand and not technically wrong, but readers comparing against `show ospfv3 database` output should be aware.
- The Cisco `router ospfv3` unified address-family configuration model is correct for IOS 15.x and IOS XE; older IOS versions used the deprecated `ipv6 router ospf` syntax.
- The expected `show ipv6 route ospf` output line (`OI ::/0 [110/100] via FE80::ABR, <interface>`) is illustrative — the AD/metric `[110/100]` matches the configured `default-cost 100`.
- Linux iproute2's `proto ospf` (188) resolves correctly in modern distributions (verified via `/etc/iproute2/rt_protos`).
- FRR's stub-area support in `ospf6d` was added relatively recently and historically had bugs (e.g. https://github.com/FRRouting/frr/issues/3812). The commands as fixed should work on current FRR 8.x/9.x stable releases.
