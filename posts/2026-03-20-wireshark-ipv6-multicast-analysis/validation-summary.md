# Validation Summary: How to Analyze IPv6 Multicast Traffic in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark display filters
- tshark CLI
- IPv6 multicast addressing (ff00::/8, ff02::/16, ff05::/16, ff0e::/16)
- ICMPv6 (types 130, 131, 132, 133, 134, 135, 143)
- Multicast Listener Discovery (MLDv1, MLDv2)
- Neighbor Discovery Protocol (NDP) / solicited-node multicast
- Router Advertisement / Router Solicitation / SLAAC
- mDNS (Bonjour/Avahi) over IPv6
- DHCPv6 multicast

## Sources Consulted
- [IANA IPv6 Multicast Address Space Registry](https://www.iana.org/assignments/ipv6-multicast-addresses/ipv6-multicast-addresses.xml)
- [RFC 3810 — Multicast Listener Discovery Version 2 (MLDv2) for IPv6](https://www.rfc-editor.org/rfc/rfc3810)
- [RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)](https://www.rfc-editor.org/rfc/rfc4861)
- [RFC 4291 — IP Version 6 Addressing Architecture (solicited-node multicast)](https://www.rfc-editor.org/rfc/rfc4291)
- [Wireshark Display Filter Reference: ICMPv6](https://www.wireshark.org/docs/dfref/i/icmpv6.html)
- [Wireshark Display Filter Reference: IPv6](https://www.wireshark.org/docs/dfref/i/ipv6.html)
- [Ask Wireshark — MLD filter discussion](https://ask.wireshark.org/question/31741/icmpv6-capture-filter-fails-for-mld-messages/)

## Issues Found
No technical issues found. Verified:
- IANA-assigned well-known IPv6 multicast addresses (ff02::1, ff02::2, ff02::16, ff02::fb, ff02::1:2) are correct.
- ICMPv6 type numbers (130 Listener Query, 131 MLDv1 Report, 132 Listener Done, 133 Router Solicitation, 134 Router Advertisement, 135 Neighbor Solicitation, 143 MLDv2 Report) are correct per IANA/RFC 3810/RFC 4861.
- Solicited-node multicast derivation (2001:db8::10 → ff02::1:ff00:0010) is correct — low-order 24 bits appended to the ff02::1:ff00:0/104 prefix.
- `mld` is a valid Wireshark display filter shortcut for MLD messages.
- `ipv6.dst == ff00::/8`, `/16`, and `/104` CIDR notation works in Wireshark's display-filter engine.
- tshark invocation (`-r`, `-Y`, `-T fields -e`) is correct.
- `dns.flags.response` is a valid Wireshark DNS field.
- mDNS uses UDP/5353 and IPv6 group ff02::fb (correct).

## Review Notes
- ff02::1:2 is formally "All_DHCP_Relay_Agents_and_Servers" (per IANA/RFC 3315/RFC 8415); the post shortens this to "All DHCP relay agents," which is common shorthand but slightly incomplete. Not corrected — the usage context (DHCPv6 multicast) remains accurate.
- `mld` in Wireshark matches MLDv1 messages via the dedicated MLD dissector; for complete coverage of both MLDv1 and MLDv2 the explicit `icmpv6.type` filters shown later in the post are authoritative. Post already provides both approaches.
