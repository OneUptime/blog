# Validation Summary: How to Verify OSPFv3 Routing Table on FRRouting

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- FRRouting (FRR), specifically `ospf6d` and `zebra`
- OSPFv3 (OSPF for IPv6, RFC 5340)
- `vtysh` (FRR's integrated shell)
- Linux kernel routing table (iproute2 `ip -6 route`)
- systemd / journalctl

## Sources Consulted
- FRR source code (verified directly against the upstream tree at https://github.com/FRRouting/frr):
  - `ospf6d/ospf6_route.c` (path-type substrings and route-print format)
  - `ospf6d/ospf6_route.h` (path-type enum values)
  - `zebra/zebra_vty.c` (RIB display format, weight emission rule)
  - `zebra/rt_netlink.c` (kernel route protocol mapping for ospf6d → RTPROT_OSPF)
  - `lib/frrdistance.h` (default OSPFv3 administrative distance = 110)
  - `lib/route_types.txt` (route-type identifiers; `ospf6` is the protocol name, `O` is the short code)
- FRR documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- Linux kernel `linux/rtnetlink.h` (RTPROT_OSPF = 188) and iproute2 `rt_protos`

## Issues Found

1. **Incorrect path-type codes in the "Intra-Area vs Inter-Area Routes" section.** The post originally stated `N` = intra-area, `N IA` = inter-area, `E` = external. FRR's actual substrings (per `ospf6_route.c:153-155` mapped to the enum in `ospf6_route.h:132-136`) are:
   - Intra-Area → `IA`
   - Inter-Area → `IE`
   - External-1 → `E1`
   - External-2 → `E2`

   The destination type (`N` for network) is rendered separately and prefixes all of these. Replaced the route-type list with the correct `N IA` / `N IE` / `N E1` / `N E2` codes and clarified that the leading `N` is the destination-type code. Note that FRR's `IA` for intra-area is counter-intuitive (Cisco-style outputs use `IA` for inter-area), but this is what the upstream source produces.

2. **Spurious `weight 1` in the sample `show ipv6 route ospf` output.** Per `zebra/zebra_vty.c:319-320`, the `weight` field is only emitted when the nexthop weight is non-zero. Single-path (non-ECMP) routes have weight 0 and the field is omitted. Removed `, weight 1` from the three single-nexthop example lines so the sample output matches actual FRR behavior.

## Review Notes

- Verified that `ip -6 route show proto ospf` works for FRR-installed OSPFv3 routes: `zebra/rt_netlink.c` maps `ZEBRA_ROUTE_OSPF6` to `RTPROT_OSPF` (188), and iproute2 ships `ospf` as an alias for 188. Both OSPFv2 and OSPFv3 use the same kernel protocol value.
- Default OSPFv3 administrative distance of 110 (the `[110/...]` in the sample) is correct (`lib/frrdistance.h:20`).
- The `Known via "ospf6"` string in the per-prefix output is correct — it comes from `route_types.txt` where the OSPFv3 short name is `ospf6`.
- The codes legend in the sample output is a slightly trimmed version of FRR's real output (e.g. omits `> - selected`, `* - FIB`, `q - queued`, `A - Babel`, `D - SHARP`, `f - OpenFabric`). The post separately explains `>` and `*` in prose, so this trimming is acceptable for a tutorial.
- The debug snippet mixes shell and vtysh prompts in a single fenced block (the line `vtysh` is shell, the next three are vtysh config-mode commands). Functionally correct, but could be split into two blocks in a future revision for readability. Not a technical defect.
