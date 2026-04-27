# Validation Summary: How to Set Up OSPF Stub Areas to Reduce Routing Table Size

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- OSPF Stub Areas
- OSPF LSA types (Type 1-5)
- Cisco IOS configuration commands
- Network routing scalability

## Sources Consulted
- RFC 2328 (OSPF Version 2) — Section 3.6 (Stub Areas) and Section 12.4.4 (Originating summary-LSAs into stub areas)
- Cisco IOS IP Routing: OSPF Configuration Guide — `area stub` and `area default-cost` commands
- Cisco IOS Command Reference — `show ip ospf`, `show ip route ospf`, `show ip route summary` output formats
- Cisco documentation on "OSPF Stub Router Advertisement" and stub area behavior
- Cisco IOS routing table code conventions (O, O IA, O*IA, O E1/E2)

## Issues Found

1. **Routing table output — default route code in stub area**
   - **Was:** `O IA  0.0.0.0/0 [110/11] via 172.16.1.254`
   - **Changed to:** `O*IA 0.0.0.0/0 [110/11] via 172.16.1.254` (with candidate-default asterisk)
   - **Why:** In Cisco IOS, the default route injected into a stub area by the ABR is displayed with the candidate-default code `O*IA` (the asterisk indicates "candidate default" route, per Cisco's route-code legend). Showing it as plain `O IA` is technically inaccurate for how it actually appears in `show ip route` output.

## Review Notes

The post is otherwise technically sound. Verified facts:

- **Type-5 LSAs carry external routes** — Correct per RFC 2328.
- **Stub areas block Type-4 and Type-5 LSAs** — Correct per RFC 2328 §3.6.
- **Default route injected as Type-3 (Summary) LSA** — Correct per RFC 2328 §12.4.4.
- **Default cost of 1 for the injected default route** — Correct; matches Cisco IOS `area default-cost` default value.
- **All routers in a stub area must agree on the stub flag** — Correct; the E-bit in the OSPF Hello packet must match for adjacency formation, otherwise the routers will fail with "Area type mismatch."
- **Cisco IOS commands** (`router ospf`, `router-id`, `network ... area`, `area X stub`, `area X default-cost`) — All syntactically correct.
- **LSA-type table** — Accurate representation of which LSA types are permitted in a stub area.
- **`show ip ospf` and `show ip route ospf` output** — Plausible and consistent with real Cisco IOS output.
- **Cost calculation in example** (`[110/11]` = ABR default-cost 1 + transit cost 10) — Mathematically consistent.

The simplified `show ip route summary` output omits the `Replicates` column and the per-OSPF-type breakdown that newer IOS versions include, but this is acceptable as a teaching simplification and not technically wrong.

No version-specific caveats. The configuration syntax shown applies to all modern Cisco IOS / IOS-XE releases.
