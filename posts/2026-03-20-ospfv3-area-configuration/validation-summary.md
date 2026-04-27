# Validation Summary: How to Understand OSPFv3 Area Configuration for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OSPFv3 (RFC 5340)
- IPv6 routing
- Cisco IOS / IOS XE OSPFv3 unified address-family configuration
- FRRouting (FRR) ospf6d
- OSPF area types (Backbone, Regular, Stub, Totally Stub, NSSA)
- Area Border Router (ABR) and Inter-Area-Prefix LSAs
- OSPFv3 Virtual Links

## Sources Consulted
- RFC 5340 — OSPF for IPv6
- FRRouting ospf6d documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- Cisco IOS XE OSPFv3 configuration guide (unified address-family `router ospfv3` syntax)
- Cisco IOS command reference for `area stub`, `area stub no-summary`, and `area virtual-link`

## Issues Found
- **FRR show commands used the OSPFv2 daemon name (`ospf`) instead of the OSPFv3 daemon name (`ospf6`).** FRR distinguishes OSPFv2 (`ospfd`, `show ipv6 ospf` does not exist) from OSPFv3 (`ospf6d`, accessed via `show ipv6 ospf6 ...`). Fixed three occurrences:
  - `vtysh -c "show ipv6 ospf"` → `vtysh -c "show ipv6 ospf6"`
  - `vtysh -c "show ipv6 ospf database inter-prefix"` → `vtysh -c "show ipv6 ospf6 database inter-prefix"`
  - `vtysh -c "show ipv6 ospf database"` → `vtysh -c "show ipv6 ospf6 database"`

All Cisco IOS configuration snippets were verified correct for the unified `router ospfv3` address-family syntax. The FRR `router ospf6` config block, `ospf6 router-id`, and `ipv6 ospf6 area <id>` interface assignment are correct in modern FRR.

## Review Notes
- The post uses OSPFv2 LSA terminology ("Type 3 LSAs") for OSPFv3. In OSPFv3 these are formally called Inter-Area-Prefix LSAs (LSA function code 0x2003); the post does call this out parenthetically in the ABR section. This is acceptable shorthand commonly used in Cisco docs.
- FRR ospf6d stub-area support (`area A.B.C.D stub [no-summary]`) was added in relatively recent FRR releases (~8.1+). On older FRR builds, stub areas may not be supported in OSPFv3. Readers using older FRR should verify their version. NSSA support in FRR ospf6d is still limited compared to ospfd, though the post does not provide an FRR NSSA configuration example, so this is not a correctness issue.
- The post correctly notes that stub `area ... stub` is configured under `router ospfv3` / address-family on Cisco and under `router ospf6` on FRR. All Cisco syntax (`area 2 stub`, `area 3 stub no-summary`, `area 1 virtual-link 2.2.2.2`, `show ospfv3 database summary`, `show ospfv3 interface brief`) is current and correct.
