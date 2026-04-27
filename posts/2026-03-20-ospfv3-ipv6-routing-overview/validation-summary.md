# Validation Summary: How to Understand OSPFv3 for IPv6 Routing

## Status
validated

## Post Type
Guide / Reference (introductory technical overview)

## Technologies Covered
- OSPFv3 (RFC 5340)
- IPv6 link-local addressing
- IPsec authentication for OSPFv3 (RFC 4552)
- OSPFv3 Address Families (RFC 5838)
- FRRouting (`vtysh`, `ospf6d`)
- Cisco IOS OSPFv3 configuration

## Sources Consulted
- RFC 5340 — OSPF for IPv6 (https://www.rfc-editor.org/rfc/rfc5340)
- RFC 4552 — Authentication/Confidentiality for OSPFv3 (https://www.rfc-editor.org/rfc/rfc4552)
- RFC 5838 — Support of Address Families in OSPFv3 (https://www.rfc-editor.org/rfc/rfc5838)
- IANA IPv6 Multicast Address Assignments (ff02::5 / ff02::6)
- IANA Protocol Numbers (89 = OSPFIGP)
- FRRouting OSPFv3 documentation (https://docs.frrouting.org/en/latest/ospf6d.html)
- FRR source: `ospf6d/ospf6_top.c`, `ospf6d/ospf6_neighbor.c`, `ospf6d/ospf6d.c`, `lib/route_types.txt`
- Cisco IOS OSPFv3 command reference (`router ospfv3` / `router-id`)

## Issues Found
- **Incorrect FRRouting show commands.** The post used Cisco-style tokens (`show ipv6 ospf neighbor`, `show ipv6 ospf database`, `show ipv6 route ospf`). FRR's OSPFv3 commands are namespaced under `ospf6` and these forms are not registered in FRR — they would fail in `vtysh`. Verified against the FRR source tree (DEFUNs/DEFPYs in `ospf6d/`) across stable/8.5, 9.1, 10.0, and master: only the `ospf6` form exists.
  - Changed `show ipv6 ospf neighbor` → `show ipv6 ospf6 neighbor`
  - Changed `show ipv6 ospf database` → `show ipv6 ospf6 database`
  - Changed `show ipv6 route ospf` → `show ipv6 route ospf6`

## Review Notes
- The Cisco snippet (`router ospfv3 1` / `router-id 1.1.1.1`) is valid for the unified OSPFv3 address-family configuration model on modern Cisco IOS / IOS XE.
- The FRR snippet (`router ospf6` / `ospf6 router-id 1.1.1.1`) matches the canonical command form in `ospf6d` (DEFUN `ospf6_router_id` at `ospf6d/ospf6_top.c`). Note: FRR's own published "larger example" config still shows a bare `router-id` line, but that example is stale — the bare form is not implemented; the `ospf6 router-id` form used here is correct.
- IPsec authentication via RFC 4552 is the originally-specified mechanism. RFC 7166 later defined an in-protocol authentication trailer for OSPFv3, which is now widely implemented as an alternative. Worth a future mention but not technically wrong as written.
- The Instance ID is technically a field of the OSPFv3 common packet header (so it appears on every OSPFv3 packet, not only Hellos), but the post's framing — that it appears in Hellos to enable multiple instances per link — is accurate.
