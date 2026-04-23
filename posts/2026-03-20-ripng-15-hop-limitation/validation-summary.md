# Validation Summary: How to Understand RIPng 15-Hop Limitation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- RIPng
- IPv6 routing
- Distance-vector routing
- FRRouting ripngd/vtysh
- OSPFv3
- BFD

## Sources Consulted
- RFC 2080: RIPng for IPv6 - https://datatracker.ietf.org/doc/html/rfc2080
- RFC 1058: Routing Information Protocol - https://datatracker.ietf.org/doc/html/rfc1058
- RFC 5340: OSPF for IPv6 - https://datatracker.ietf.org/doc/html/rfc5340
- FRRouting RIPng documentation - https://docs.frrouting.org/en/latest/ripngd.html
- FRRouting BFD documentation - https://docs.frrouting.org/en/latest/bfd.html
- FRRouting ripngd source for `show ipv6 ripng` output formatting - https://github.com/FRRouting/frr/blob/master/ripngd/ripngd.c

## Issues Found
- Corrected the RTE field wording from "hop count field" to "metric field" to match RFC 2080 terminology.
- Corrected the metric value range: RFC 2080 defines 1-15 as reachable metrics, 16 as infinity, values above 16 as invalid route metrics, and 0xFF as the special next-hop RTE indicator.
- Clarified route poisoning versus Poison Reverse. A failed route is advertised with metric 16 as a poisoned route; Poison Reverse specifically advertises routes learned from a neighbor back toward that neighbor with metric 16.
- Updated the FRRouting `show ipv6 ripng` sample to match current FRR output structure, including separate route prefix and detail lines with `Next Hop`, `Via`, `Metric`, `Tag`, and `Time`.
- Fixed the metric detection commands so they check the actual metric field in the current FRR output and distinguish near-limit metrics from unreachable metric 16 routes.
- Replaced an exact "12 update cycles = ~6 minutes" count-to-infinity estimate with a timer-based statement that avoids topology-specific arithmetic.
- Qualified the OSPFv3 sub-second failover claim: sub-second failover typically requires tuned timers or BFD rather than being an inherent default behavior.
- Qualified the summary claim that OSPFv3 has "no hop count limit" to state that it is not constrained by RIPng's 15-hop infinity value.

## Review Notes
FRRouting CLI command availability was checked against current FRR documentation. Older FRR releases documented `show ip ripng`, but current FRR documents `show ipv6 ripng [vrf NAME]`, which is the command used in the post.
