# Validation Summary: How to Troubleshoot OSPF LSA Types and Their Propagation

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OSPFv2 (Open Shortest Path First)
- LSA types 1, 2, 3, 4, 5, 7, and 9/10/11 (Opaque)
- Cisco IOS routing CLI / OSPF database commands
- ABR / ASBR roles, NSSA, stub area filtering

## Sources Consulted
- [Cisco OSPF Command Reference (`show ip ospf` family)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-s1.html)
- [Cisco OSPF ABR Type 3 LSA Filtering — Cisco IOS 15M&T](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/15-mt/iro-15-mt-book/iro-abr-type-3.html)
- [RFC 2328 — OSPF Version 2](https://www.rfc-editor.org/rfc/rfc2328) (§12.1 LSA types, Appendix B Architectural Constants — MaxAge = 3600s, LSRefreshTime = 1800s)
- [RFC 3101 — The OSPF NSSA Option](https://www.rfc-editor.org/rfc/rfc3101) (Type-7 LSAs and ABR Type-7→Type-5 translation)
- [RFC 5250 — The OSPF Opaque LSA Option](https://www.rfc-editor.org/rfc/rfc5250) (Type 9 link-local, Type 10 area, Type 11 AS scope)
- [RFC 3623 — Graceful OSPF Restart](https://www.rfc-editor.org/rfc/rfc3623) (Grace LSA carried in Type-9 opaque)
- [RFC 3630 — TE Extensions to OSPFv2](https://www.rfc-editor.org/rfc/rfc3630) (TE LSA carried in Type-10 opaque)

## Issues Found

1. **Invalid Cisco IOS command `show ip ospf [process-id] database filter-list`.** The `show ip ospf database` command does not accept a `filter-list` keyword (valid sub-keywords are LSA types, plus `database-summary`, `self-originate`, `adv-router`, `max-age`). Configured area filter-lists are visible via `show ip ospf` per the Cisco IOS 15M&T configuration guide. Replaced both occurrences (in Step 5 code block and in the Common Troubleshooting Scenarios table) with `show ip ospf | include Filter`, which extracts the per-area "Filter-list: ... (in|out)" lines from `show ip ospf` output.

2. **Sample `show ip ospf database summary` output used CIDR notation for the network mask.** Cisco IOS displays the Network Mask field in dotted-decimal in the documented command-reference output. Changed `Network Mask: /24` to `Network Mask: 255.255.255.0` in the Step 3 sample.

## Review Notes
- LSA type table entries are accurate per RFC 2328 and RFC 3101. Type-7→Type-5 translation is performed by the elected NSSA-ABR translator (highest router-ID NSSA ABR by default), but "translated to Type 5 by ABR" is acceptable shorthand for an introductory reference.
- MaxAge = 3600 s and the implication that LSAs at this age are being flushed is correct (RFC 2328 Appendix B). The post does not mention LSRefreshTime (1800 s) — not an error, just not covered.
- Cisco IOS does render `Network Mask` as `/24` prefix-style in some IOS XE releases' output for certain show commands, so the original was not necessarily wrong on every platform; the dotted-decimal form matches the canonical Cisco command-reference example output and is broadly accurate.
- Step 7 mentions Type-5 should not appear in stub areas — correct. The post does not explicitly mention that Type-3 LSAs are also blocked in totally stubby areas (only the default route is allowed), but the post's scope is troubleshooting LSA propagation generally, so this is fine.
