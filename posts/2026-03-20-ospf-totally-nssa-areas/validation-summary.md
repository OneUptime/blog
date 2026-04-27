# Validation Summary: How to Configure OSPF Totally NSSA Areas

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- OSPF NSSA (Not-So-Stubby Area) per RFC 3101
- OSPF Totally NSSA (Cisco proprietary extension)
- FRRouting (FRR) ospfd configuration
- Cisco IOS OSPF configuration
- LSA Types (1, 2, 3, 4, 5, 7)

## Sources Consulted
- RFC 2328 (OSPF Version 2): https://datatracker.ietf.org/doc/html/rfc2328
- RFC 3101 (The OSPF NSSA Option): https://datatracker.ietf.org/doc/html/rfc3101
- FRRouting OSPFv2 documentation: https://docs.frrouting.org/en/latest/ospfd.html
- Cisco IOS OSPF Configuration Guide (NSSA / Totally NSSA): https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/13703-8.html
- Companion blog posts in the same series for internal consistency:
  - posts/2026-03-20-ospf-stub-areas-reduce-routing-table/README.md
  - posts/2026-03-20-ospf-totally-stubby-areas/README.md
  - posts/2026-03-20-ospf-not-so-stubby-areas-nssa/README.md

## Issues Found

### Issue 1: Incorrect Stub area LSA filtering in comparison table
The OSPF Area Types Comparison table claimed that Stub areas allow Type 4 LSAs:

> | Stub | Type 5 (External) | Types 1, 2, 3, 4 |

In practice (and as documented in companion posts in the same series), Stub areas block both Type 4 (ASBR Summary) and Type 5 (AS External) LSAs — Type 4 LSAs serve no purpose without Type 5 LSAs in the area, so they are filtered by both Cisco IOS and FRR. The companion `ospf-stub-areas-reduce-routing-table` post in this series correctly states "Type 4: ASBR Summary: No" for stub. Fixed the row to: `| Stub | Types 4, 5 | Types 1, 2, 3 |`.

I also updated the NSSA row from `Types 1, 2, 3, 4, 7` to `Types 1, 2, 3, 7` for consistency with the companion `ospf-not-so-stubby-areas-nssa` post in the same series, which lists Type 4 as "No" in NSSA.

### Issue 2: Invalid FRR config structure in the "Example FRR Full Config"
The example nested `interface` blocks inside the `router ospf` block, which is not valid FRR syntax. In FRR (vtysh), `interface` is a top-level configuration node — you must exit `router ospf` before configuring interfaces. The original example would fail to parse / configure correctly. Restructured the snippet so `interface eth0`, `interface eth1`, and `router ospf` are sibling top-level blocks separated by `!`, matching the standard FRR `frr.conf` integrated-config style.

## Review Notes
- The core technical claims (Totally NSSA blocks Type 3/4/5 while allowing Type 7; ABR injects a default route as Type 3; `no-summary` only on the ABR; Type 7 → Type 5 translation at the ABR) are all correct.
- The `O*IA` route code shown for the default route from a Totally NSSA ABR is correct because the ABR injects the default as a Type 3 summary LSA (not a Type 7 default), so it appears as Inter-Area on internal routers.
- The `vtysh -c "show ip ospf database nssa-external"` command is valid in FRR.
- The Cisco IOS snippet is syntactically correct.
- Note for future improvement (not corrected): the standalone ABR/ASBR snippets do not show interface area assignments (e.g., `network` or `ip ospf area`), which a reader would need to make the configuration functionally complete. They are clearly presented as snippets, so this is acceptable but could be expanded.
- The Type 4 LSA filtering behavior in NSSAs is a subtle area where RFC 3101 is not explicit and implementation behavior varies; the alignment chosen here matches the rest of this blog series.
