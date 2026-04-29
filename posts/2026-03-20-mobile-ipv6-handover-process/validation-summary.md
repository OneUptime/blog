# Validation Summary: How to Understand Mobile IPv6 Handover Process

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Mobile IPv6 (MIPv6, RFC 6275)
- Fast Handovers for Mobile IPv6 (FMIPv6, RFC 5568)
- Optimistic Duplicate Address Detection (RFC 4429)
- Neighbor Discovery Protocol (NDP) and Router Advertisements (RAs)
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- Linux `ip` (iproute2) command and IPv6 sysctl tunables
- 802.11r (Fast BSS Transition)

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6 (https://datatracker.ietf.org/doc/html/rfc6275) — verified handover phases, BU flags (H, A), and BA status code semantics.
- RFC 5568 — Mobile IPv6 Fast Handovers (https://datatracker.ietf.org/doc/html/rfc5568) — verified RtSolPr, PrRtAdv, FBU, FNA message names and procedure ordering.
- RFC 4429 — Optimistic DAD for IPv6 (https://datatracker.ietf.org/doc/html/rfc4429) — verified the cited mechanism for treating an address as usable while DAD runs.
- Linux kernel IPv6 sysctl documentation (Documentation/networking/ip-sysctl.txt) — verified `dad_transmits`, `optimistic_dad`, `router_solicitations`, and `router_solicitation_interval` knobs under `net.ipv6.conf.<dev>.*`.
- iproute2 `ip-address(8)` man page — verified `ip -6 addr show`, `ip -6 monitor address`, `ip -6 route show default` syntax and the lowercase "tentative" / "deprecated" address flags emitted in output.

## Issues Found
1. **Mermaid diagram terminus was incorrect for the route-optimized path.** The original diagram routed both branches (route optimization Yes/No) into a single "Resume traffic via HA tunnel" node. With route optimization, traffic flows directly between the Mobile Node and Correspondent Node — it does NOT continue through the HA tunnel. Fixed by giving the RO branch its own terminal node ("Resume traffic directly with CNs") while keeping the non-RO branch terminating at the HA tunnel node.
2. **`grep -E "TENTATIVE|PREFERRED"` would never match real `ip -6 addr show` output.** The Linux iproute2 tool emits address state flags in lowercase ("tentative", "deprecated"); "PREFERRED" is not a string emitted at all (preferred state is implicit and only the lifetime appears as `preferred_lft`). Replaced the grep with `grep -iE "tentative|deprecated"` and updated the explanatory comment to describe how the "tentative" flag actually behaves (present during DAD, removed after success).

## Review Notes
- All RFC citations (6275, 5568, 4429) and the protocol message names (RtSolPr, PrRtAdv, FBU, FNA, BU, BA) are correct.
- BU flags `H` (Home Registration) and `A` (Acknowledge) and BA `status == 0` for success match RFC 6275.
- The cited Linux sysctls are valid; modern kernels also expose `router_solicitation_max_interval` and `router_solicitation_delay`, but the names used in the post still work and remain the canonical knobs for this purpose.
- The 802.11r reference (Fast BSS Transition) is appropriate for reducing layer-2 handover latency.
- Latency table values are illustrative ranges and consistent with published MIPv6 handover measurements; nothing to flag.
