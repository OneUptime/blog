# Validation Summary: How to Debug IPv6 Multicast Issues with Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark / tshark display filters
- tcpdump capture filters
- IPv6 multicast addressing (RFC 4291, RFC 7346)
- MLD / MLDv2 (Multicast Listener Discovery — RFC 2710, RFC 3810 / RFC 9777)
- PIM-SM (Protocol Independent Multicast — Sparse Mode, RFC 7761)
- ICMPv6 (RFC 4443) and NDP (RFC 4861)
- DHCPv6 multicast (RFC 8415 / RFC 9915)

## Sources Consulted
- Wireshark Display Filter Reference — IPv6: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark Display Filter Reference — ICMPv6: https://www.wireshark.org/docs/dfref/i/icmpv6.html
- Wireshark User's Guide §6.4 (display filter operators, including `matches`)
- IANA ICMPv6 Type Numbers registry
- IANA PIM Message Types registry
- IANA IPv6 Multicast Address Space Registry
- IANA Protocol Numbers (PIM = 103)
- RFC 7761 (PIM-SM)
- RFC 3810 / RFC 9777 (MLDv2)
- RFC 2710 (MLDv1)
- RFC 4861 (NDP)
- RFC 4291 / RFC 7346 (IPv6 multicast addressing and scopes)
- tcpdump pcap-filter(7) man page

## Issues Found

1. **Invalid IPv6 address `ff3e::db8:stream` (multiple occurrences).** The literal "stream" contains characters (`s`, `t`, `r`, `m`) that are not valid hexadecimal digits, so this string cannot be parsed as an IPv6 address by Wireshark or any other tool. Replaced all four occurrences with `ff3e::db8:1`, which preserves the `ff3e::` (transient, global-scope, embedded-RP) prefix the author was clearly going for while being a syntactically valid address.

2. **Invalid Wireshark display filter `ip6.hop_limit` (line 115).** Wireshark uses the `ipv6.` prefix for IPv6 fields, and the hop limit field is `ipv6.hlim` (verified against the official Wireshark display filter reference). `ip6.hop_limit` does not exist as a display filter and would produce a parse error. Replaced with `ipv6.hlim`. The author already used the correct name in the surrounding lines, so this was an isolated typo.

3. **Broken `matches` filters on IPv6 address fields.** The post used `ipv6.dst matches "^ff"` and `ipv6.dst matches "^ff02"` to identify multicast traffic. Wireshark's `matches` operator runs PCRE against the raw byte representation of binary fields like `ipv6.dst`, not the textual `ff02::1` form, so the regex `^ff` would attempt to match the literal ASCII bytes `0x66 0x66` against the 16 binary octets and never match. Replaced with the correct CIDR-notation form: `ipv6.dst == ff00::/8` (all multicast) and `ipv6.dst == ff02::/16` (link-local multicast). Also updated the matching reference in the Summary section.

## Review Notes

- All ICMPv6 message type numbers (130, 131, 132, 143, 135, 136) and PIM message types (0, 1, 2, 3, 4, 8) verified against the IANA registries — correct.
- MLDv2 record type values (1=MODE_IS_INCLUDE, 2=MODE_IS_EXCLUDE, 3=CHANGE_TO_INCLUDE_MODE) verified against RFC 3810 — correct.
- The MLDv2 Wireshark filter field names `icmpv6.mldr.mar.record_type` and `icmpv6.mldr.mar.multicast_address` are correct (`mar` = "Multicast Address Record").
- `ff02::1:2` is the correct All_DHCP_Relay_Agents_and_Servers address.
- The tcpdump expression `'ip6 and (icmp6 or proto 103)'` is correct (PIM = IP protocol 103).
- Forward-looking note: RFC 9777 (May 2025) obsoleted RFC 3810 as the primary MLDv2 specification, but the on-wire types and record-type values are unchanged, so the post's content remains accurate.
