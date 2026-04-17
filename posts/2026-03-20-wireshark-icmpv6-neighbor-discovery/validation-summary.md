# Validation Summary: How to Analyze ICMPv6 Neighbor Discovery in Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (display filters, Statistics → Conversations)
- ICMPv6 / Neighbor Discovery Protocol (NDP) — RFC 4861
- IPv6 Stateless Address Autoconfiguration / Duplicate Address Detection (DAD) — RFC 4862
- tcpdump (capture filters, BPF byte-offset matching)

## Sources Consulted
- Wireshark Display Filter Reference for ICMPv6: https://www.wireshark.org/docs/dfref/i/icmpv6.html
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (DAD behavior): https://www.rfc-editor.org/rfc/rfc4862
- IANA ICMPv6 Type Numbers registry
- tcpdump pcap-filter(7) man page (BPF `ip6[40]` semantics)

## Issues Found
- **Wireshark NA Solicited flag field name** — The post used `icmpv6.nd.na.flag.solicited` in the DAD-conflicts filter. The actual Wireshark display filter field is `icmpv6.nd.na.flag.s` (per the official Wireshark display filter reference). Updated the filter to `icmpv6.nd.na.flag.s == 0` so it parses and matches correctly. The other NA flag fields follow the same single-letter convention (`.r`, `.o`, `.rsv`).

## Review Notes
- ICMPv6 type numbers (133–137) and the RS/RA/NS/NA/Redirect mappings are correct per RFC 4861 / IANA registry.
- The solicited-node multicast format `ff02::1:ffXX:XXXX` (low-order 24 bits of the target address) is correct.
- The DAD description (NS sourced from `::` to the solicited-node multicast, with the conflict response sent unsolicited to `ff02::1`) matches RFC 4862 §5.4.
- The tcpdump BPF expression `ip6[40] == ...` correctly references the first byte after the fixed 40-byte IPv6 header (the ICMPv6 Type field). This works only when no extension headers are present between the IPv6 header and the ICMPv6 message — generally fine for NDP on a local link, but worth keeping in mind for environments using IPsec or fragmentation.
- The `icmpv6` capture filter (line "Apply the capture filter: `icmp6`") is the correct libpcap/BPF keyword for the GUI capture filter (Wireshark uses libpcap syntax for capture filters and its own syntax for display filters — the post uses each in the right place).
- The display-filter language uses `&&`/`||`; the post uses these consistently.
- Field `ipv6.src == ::` is valid Wireshark filter syntax for matching the unspecified address.
