# Validation Summary: How to Understand 6PE: IPv6 over MPLS with BGP

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- 6PE (IPv6 Provider Edge, RFC 4798)
- 6VPE (IPv6 VPN Provider Edge, RFC 4659)
- MPLS (Multi-Protocol Label Switching)
- MP-BGP (Multi-Protocol BGP, RFC 4760)
- BGP Labeled Unicast (RFC 3107 / RFC 8277)
- LDP (Label Distribution Protocol)
- IPv4-mapped IPv6 addresses (RFC 4291)
- Cisco IOS / IOS XE operational commands

## Sources Consulted
- RFC 4798 — Connecting IPv6 Islands over IPv4 MPLS Using IPv6 Provider Edge Routers (6PE)
- RFC 4659 — BGP-MPLS IP Virtual Private Network (VPN) Extension for IPv6 VPN (6VPE)
- RFC 4760 — Multiprotocol Extensions for BGP-4 (MP_REACH_NLRI definition)
- RFC 3107 / RFC 8277 — Carrying Label Information in BGP-4 (SAFI 4 definition)
- IANA Address Family Identifiers (AFI) and Subsequent Address Family Identifiers (SAFI) registries
- IANA BGP Path Attributes registry
- Cisco IOS / IOS XE command reference for BGP, MPLS, and IPv6

## Issues Found
- **SAFI 4 naming**: The MP-BGP section described SAFI 4 as "NLRI with labeled next-hop". Per IANA and RFC 8277, SAFI 4 is officially "NLRI with MPLS Labels" — the label applies to the prefix/NLRI, not the next-hop. Updated the text to "SAFI: 4 (NLRI with MPLS Labels)".

## Review Notes
- RFC reference (4798), AFI value (2), MP_REACH_NLRI path attribute type (14), and the use of IPv4-mapped IPv6 addresses (`::ffff:a.b.c.d`) for BGP next-hop are all correctly described per RFC 4798 §2.
- All Cisco IOS / IOS XE commands listed (`show bgp ipv6 unicast summary`, `show ipv6 cef`, `show mpls forwarding-table`, `traceroute ipv6`, `debug bgp ipv6 unicast updates`, `debug mpls lfib entry`) are valid.
- The 6PE vs 6VPE comparison table is conceptually accurate; 6VPE uses SAFI 128 (MPLS-labeled VPN address) per RFC 4659, while 6PE uses SAFI 4 — consistent with the post's distinction between "IPv6 address family" and "IPv6 VPN address family".
- Label stack and PHP (Penultimate Hop Popping) operation is described correctly: outer LDP/IGP label popped by penultimate P router, inner BGP label used by egress PE for IPv6 lookup.
- The illustrative prefixes such as `2001:db8:site-a::/48` contain non-hex characters in the `site-a` portion; these are clearly pseudocode placeholders and not intended as literal addresses.
