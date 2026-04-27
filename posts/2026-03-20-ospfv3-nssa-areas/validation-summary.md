# Validation Summary: How to Configure OSPFv3 NSSA Areas for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OSPFv3 (RFC 5340 — OSPF for IPv6)
- NSSA / RFC 3101 (The OSPF Not-So-Stubby Area Option)
- Cisco IOS / IOS XE (`router ospfv3` integrated process with `address-family ipv6 unicast`)
- FRRouting (`ospf6d` daemon, `vtysh`)

## Sources Consulted
- [RFC 3101 — The OSPF Not-So-Stubby Area (NSSA) Option](https://datatracker.ietf.org/doc/html/rfc3101)
- [RFC 5340 — OSPF for IPv6](https://datatracker.ietf.org/doc/html/rfc5340)
- [Cisco IOS XE — Configuring NSSA for OSPFv3 (Catalyst 9500, 17.10.x)](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/17-10/configuration_guide/rtng/b_1710_rtng_9500_cg/configuring_nssa_for_ospfv3.html)
- [Cisco IOS — Configuring NSSA for OSPFv3 (15.2E)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/15-e/iro-15-e-book/iro-ospfv3-nssa-cfg.html)
- [Cisco — Configure OSPFv3 in an NSSA Area to Enable Translation of Type-7 LSA with Zero Forwarding Address](https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/217728-configure-ospfv3-in-a-nssa-area-to-enabl.html)
- [FRR ospf6d documentation](https://docs.frrouting.org/en/latest/ospf6d.html)

## Issues Found
1. **Cisco show command for Type-7 LSAs used wrong keyword.** The post had `show ospfv3 database nssa`. Per the Cisco IOS XE OSPFv3 command reference, the keyword is `nssa-external` (full syntax: `show ospfv3 [process-id [area-id]] [address-family] database [nssa-external [ipv6-prefix] [link-state-id]]`). Changed to `show ospfv3 database nssa-external`.
2. **FRR command `show ipv6 ospf` is OSPFv2, not OSPFv3.** In FRR, the OSPFv3 daemon is `ospf6d` and the show command is `show ipv6 ospf6`. The verification block used `vtysh -c "show ipv6 ospf"`, which targets OSPFv2 (IPv4) instead. Fixed to `show ipv6 ospf6`.
3. **FRR keyword `as-nssa` is not a valid LSA type filter.** Per FRR's `ospf6d` documentation, the database filter syntax is `show ipv6 ospf6 [vrf <NAME|all>] database <router|network|inter-prefix|inter-router|as-external|group-membership|type-7|link|intra-prefix>`. The Type-7 NSSA filter is `type-7`, and the command must use `ospf6` not `ospf`. Fixed `show ipv6 ospf database as-nssa` to `show ipv6 ospf6 database type-7`.

## Review Notes
- Cisco config commands (`router ospfv3 1`, `address-family ipv6 unicast`, `area 1 nssa`, `area 1 nssa no-summary`, `area 1 nssa default-information-originate`, `redistribute static`) all match current Cisco IOS / IOS XE syntax.
- FRR `router ospf6` / `area 0.0.0.1 nssa` / `area 0.0.0.1 nssa no-summary` reflects ospf6d NSSA support (added in FRR 8.x); readers on older FRR versions may not have NSSA available in `ospf6d`.
- The post (like the rest of this OSPFv3 series) uses OSPFv2 LSA-type shorthand ("Type 5", "Type 7", "Type 3"); in OSPFv3 these are AS-External-LSA, NSSA-LSA, and Inter-Area-Prefix-LSA respectively, with different LS Type values per RFC 5340. This is common industry usage and not technically wrong.
- Per RFC 3101 §3.2, an NSSA ABR will not translate a Type-7 LSA with a zero forwarding address into a Type-5 LSA by default; readers redistributing static routes without setting a forwarding address may need `capability type7 translate zero-forward-addr` (Cisco IOS XR) or equivalent. Out of scope for this introductory guide but worth flagging.
