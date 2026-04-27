# Validation Summary: How to Redistribute Routes into OSPFv3

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OSPFv3 (IPv6 routing protocol)
- Cisco IOS / IOS XE (`router ospfv3` syntax)
- FRRouting (FRR) ospf6d (`router ospf6`)
- Route maps and IPv6 prefix lists
- BGP-to-OSPFv3 redistribution
- OSPF external LSAs (Type 5 / Type 7)

## Sources Consulted
- FRRouting ospf6d documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- FRR source code (ospf6d/ospf6_asbr.c, ospfd/ospf_routemap.c) for command grammar
- Cisco IOS IPv6 Command Reference (`ipv6 prefix-list`, `redistribute` under address-family ipv6 unicast)
- Cisco IOS Routing Configuration Guide (OSPFv3 redistribution, metric-type)
- RFC 5340 (OSPF for IPv6) for LSA type definitions

## Issues Found
1. **FRRouting `redistribute` metric-type syntax** (two occurrences). The post used `metric-type type-1` and `metric-type type-2` for the FRR `router ospf6` redistribute command. FRR's grammar for that command is `metric-type (1-2)` — an integer, not a token. The `type-1`/`type-2` form is only valid in route-map `set metric-type`, not in the `redistribute` line. Changed:
   - `redistribute static metric 20 metric-type type-1` → `redistribute static metric 20 metric-type 1`
   - `redistribute bgp metric 100 metric-type type-2` → `redistribute bgp metric 100 metric-type 2`

2. **Cisco IOS IPv6 prefix-list command**. The Cisco route-map example used `ip prefix-list OSPF_EXPORT seq 10 permit 2001:db8:1::/48 le 64`. The `ip prefix-list` command is for IPv4 only; IPv6 prefixes require the dedicated `ipv6 prefix-list` command. Changed to `ipv6 prefix-list OSPF_EXPORT seq 10 permit 2001:db8:1::/48 le 64`.

## Review Notes
- The Cisco route-map `set metric-type type-1` is correct (route-map `set` directives use the `type-1`/`type-2` token form on both Cisco and FRR — distinct from the `redistribute` line).
- LSA type claims are accurate per RFC 5340: Type 5 (AS-External) in regular areas, Type 7 (NSSA) in NSSA areas.
- `show ospfv3 database external` is valid on Cisco IOS XE / newer IOS that uses the unified `router ospfv3` syntax. On older IOS using `ipv6 router ospf <pid>`, the equivalent is `show ipv6 ospf database external` — worth noting for readers on older platforms.
- Some code blocks containing Cisco config are tagged ```bash for syntax highlighting purposes; this is cosmetic and does not affect technical correctness.
- The `show ipv6 route ospf` output prefix on Cisco for OSPFv3 externals is `OE1`/`OE2`, so `| include OE` correctly filters external entries.
