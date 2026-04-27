# Validation Summary: How to Verify OSPFv3 Routing Table on Cisco

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OSPFv3 (Open Shortest Path First version 3)
- Cisco IOS / IOS-XE
- IPv6 routing
- Cisco CLI (show, debug, clear commands)

## Sources Consulted
- Cisco IOS IPv6 Command Reference (`show ipv6 route`, `show ipv6 route ospf`)
- Cisco IOS OSPFv3 Command Reference (`show ospfv3 route`, `clear ipv6 ospf process`, `debug ospfv3 *`)
- RFC 5340 — OSPF for IPv6
- Cisco "OSPFv3 Address Families" configuration guide (unified address-family CLI)

## Issues Found
1. **`show ospfv3 route` output format** — The original example used bracket notation `[0/20]` for the metric, mixing the "Codes" legend used by `show ipv6 route` with the formatting of `show ospfv3 route`. In real Cisco output, `show ospfv3 route` does not use the `[AD/cost]` bracket notation (that notation is specific to the IPv6 RIB output of `show ipv6 route` / `show ipv6 route ospf`). The `show ospfv3 route` output uses a `* - Best, > - Installed` codes line and an inline `cost N` value. Updated the example to use the correct format with `*> ... cost 20, area 0` style entries.

## Review Notes
- The `show ipv6 route ospf` example, route codes (`O`, `OI`, `OE1`, `OE2`), administrative distance of 110, and `[110/cost]` bracket notation are all correct.
- The default cost formula `10^8 / bandwidth` is correct, with the standard Cisco caveat that the minimum cost is 1 (so any interface ≥ 100 Mbps yields cost 1 unless `auto-cost reference-bandwidth` is adjusted).
- E1 vs E2 explanation is accurate: E1 adds the internal OSPF cost to the external metric while E2 is a flat external metric, and E2 is the default redistribution metric type.
- `clear ipv6 ospf process` is valid for legacy OSPFv3-for-IPv6 syntax. Under the newer unified address-family model, `clear ospfv3 process` is the equivalent. Both work in supported IOS versions.
- ECMP behavior described is correct; OSPFv3 supports equal-cost multipath (default 4 paths, configurable via `maximum-paths`).
- Debug commands (`debug ospfv3 spf`, `debug ospfv3 redistribute`) are valid under the modern OSPFv3 process syntax.
