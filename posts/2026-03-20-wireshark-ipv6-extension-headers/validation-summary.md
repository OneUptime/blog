# Validation Summary: How to Analyze IPv6 Extension Headers in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (display filters)
- tshark (CLI)
- IPv6 Extension Headers (Hop-by-Hop, Routing, Fragment, Destination Options, AH, ESP)
- IPsec (AH/ESP)
- Segment Routing (SRv6)
- MLD and RSVP (Router Alert)

## Sources Consulted
- Wireshark display filter reference for IPv6: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark source (epan/dissectors/packet-ipv6.c) to confirm field names currently registered
- RFC 8200 — IPv6 Specification (extension header types and Next Header values)
- RFC 4291 — IPv6 Addressing Architecture (confirms global unicast prefix `2000::/3`)
- RFC 2675 — IPv6 Jumbograms (jumbo payload option)
- RFC 2711 — IPv6 Router Alert Option (values: 0 = MLD, 1 = RSVP, 2 = Active Networks)
- RFC 5095 — Deprecation of Type 0 Routing Header in IPv6
- RFC 8754 — IPv6 Segment Routing Header (confirms SRH = Routing Type 4)
- IANA IPv6 Parameters registry: https://www.iana.org/assignments/ipv6-parameters/ipv6-parameters.xhtml

## Issues Found
- **Incorrect Wireshark field name `ipv6.opt.jumbo_payload_length`**: this field does not exist in Wireshark. The correct field for the IPv6 Jumbo Payload Length option (RFC 2675) is `ipv6.opt.jumbo` (32-bit unsigned). Replaced the incorrect name with `ipv6.opt.jumbo` under the "Analyzing Hop-by-Hop Options" section.

## Review Notes
- All Next Header values in the table match IANA (0, 43, 44, 50, 51, 59, 60).
- `ipv6.fraghdr`, `ipv6.fraghdr.offset`, `ipv6.fraghdr.more`, `ipv6.fraghdr.ident`, `ipv6.opt.router_alert`, and `ipv6.routing.type` are all valid current Wireshark display filter names.
- Router Alert values (0 = MLD, 1 = RSVP) verified against RFC 2711.
- Global unicast prefix `2000::/3` is correct per RFC 4291.
- Routing Header Type 4 = SRv6 verified against RFC 8754 / IANA.
- The first filter `ipv6.nxt != 6 && ipv6.nxt != 17 && ipv6.nxt != 58 && ipv6` is a reasonable heuristic for "packets with an extension header," but it will miss cases where the initial Next Header is ESP (50) or AH (51) only if someone considers those upper-layer; the post already lists them as extension headers so the filter intentionally catches them. Noted as acceptable.
- The "oversized Hop-by-Hop headers" filter (`ipv6.nxt == 0 && frame.len > 1500`) is a reasonable anomaly indicator but not a strict correctness check; left as-is.
