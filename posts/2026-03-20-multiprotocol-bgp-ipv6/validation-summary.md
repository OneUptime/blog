# Validation Summary: How to Understand Multiprotocol BGP for IPv6

## Status
validated

## Post Type
Reference / Conceptual guide

## Technologies Covered
- BGP-4 (RFC 4271)
- Multiprotocol BGP / MP-BGP (RFC 4760)
- IPv6 BGP (RFC 2545)
- Address Family Identifiers (AFI) / Subsequent Address Family Identifiers (SAFI)
- FRRouting (FRR) configuration and vtysh CLI

## Sources Consulted
- RFC 4760 — Multiprotocol Extensions for BGP-4 (https://datatracker.ietf.org/doc/html/rfc4760)
- RFC 2545 — Use of BGP-4 Multiprotocol Extensions for IPv6 Inter-Domain Routing (https://datatracker.ietf.org/doc/html/rfc2545)
- RFC 2858 — Multiprotocol Extensions for BGP-4 (obsoleted by RFC 4760)
- IANA Address Family Numbers registry (https://www.iana.org/assignments/address-family-numbers/)
- IANA SAFI Values registry (https://www.iana.org/assignments/safi-namespace/)
- FRRouting BGP documentation (https://docs.frrouting.org/en/latest/bgp.html)

## Issues Found

1. **Inaccurate description of IPv6 link-local next hop** (Next Hop in IPv6 BGP section)
   - The post originally stated: "When using link-local addresses, the next hop must include both the link-local address and the interface identifier."
   - This is incorrect per RFC 2545 §3 ("Constructing the Next Hop field"). When a link-local address is used, the MP_REACH_NLRI Next Hop field must contain the **global IPv6 address first, followed by the link-local IPv6 address** (32-byte Next Hop), not the link-local address plus an "interface identifier."
   - Fixed by replacing the sentence with an RFC-2545-accurate description.

2. **Invalid IPv6 placeholder address** (Running Dual-Stack BGP section)
   - The FRR configuration used `2001:db8::peer` as a placeholder neighbor address. The character `p` is not a valid hexadecimal digit, so this is not a parseable IPv6 address and FRR would reject it.
   - Replaced all occurrences with `2001:db8::2`, a valid documentation-prefix IPv6 address.

## Review Notes
- AFI/SAFI table values verified against IANA registries: IPv4=1, IPv6=2; Unicast=1, Multicast=2, MPLS-labeled VPN=128. All correct.
- MP_REACH_NLRI and MP_UNREACH_NLRI are correctly described as optional non-transitive (RFC 4760 §3).
- The phrasing "non-IPv4 protocols" for MP_REACH_NLRI/MP_UNREACH_NLRI is a slight simplification — MP-BGP can technically carry IPv4 AFIs too (e.g., IPv4 multicast SAFI=2, VPNv4 SAFI=128) — but the meaning is clear in context and not technically wrong for the IPv6 focus of the post.
- "BGP-4+" is informally tied to the IPv6 multiprotocol extensions and predates RFC 4760; the table entry attributing it loosely to the RFC 2858 era is acceptable shorthand.
- FRRouting `vtysh` command syntax and the dual-stack `address-family ipv4 unicast` / `address-family ipv6 unicast` configuration block are correct for current FRR versions.
- Mermaid sequence diagram accurately reflects MP-BGP capability negotiation and UPDATE flow.
