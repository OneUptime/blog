# Validation Summary: How to Configure OSPF Areas and Area Types

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OSPFv2 (Open Shortest Path First)
- FRR (Free Range Routing) / FRRouting
- vtysh (FRR CLI shell)
- IPv4 routing

## Sources Consulted
- RFC 2328 — OSPF Version 2 (https://datatracker.ietf.org/doc/html/rfc2328)
- RFC 3101 — The OSPF Not-So-Stubby Area (NSSA) Option (https://datatracker.ietf.org/doc/html/rfc3101)
- FRR OSPFv2 documentation (https://docs.frrouting.org/en/latest/ospfd.html)
- FRR area configuration commands: `area A.B.C.D stub`, `area A.B.C.D stub no-summary`, `area A.B.C.D nssa`
- FRR `show ip ospf` family of vtysh commands

## Issues Found
No technical issues found.

## Review Notes
- The OSPF area type table accurately reflects RFC 2328 and RFC 3101 behavior:
  - Stub areas block Type 5 (AS External) LSAs and the ABR injects a default route
  - Totally stubby areas additionally block Type 3 (Summary) and Type 4 LSAs (FRR's `no-summary` keyword)
  - NSSA areas accept external routes only as Type 7 LSAs that are translated to Type 5 by the NSSA ABR
- All FRR configuration syntax is correct: `router ospf`, `router-id`, `network ... area`, `area X stub`, `area X stub no-summary`, `area X nssa`, `redistribute connected`.
- All vtysh `show ip ospf ...` verification commands are valid.
- The post correctly notes that all routers in a stub/NSSA area must agree on the area type (stub flag must match for adjacency to form), which is a common gotcha.
- Minor potential improvement (not an error): the post could mention that for "totally NSSA" areas, FRR also supports `area X nssa no-summary`, but this is beyond the stated scope.
- Minor potential improvement: the table entry "NSSA: Redistributed only" is concise shorthand that is accurate but could benefit from explicitly noting that the redistribution must happen on a router within the NSSA.
