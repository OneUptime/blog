# Validation Summary: How to Debug Extension Header Issues with Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Wireshark
- TShark
- tcpdump
- libpcap / BPF capture filters
- ICMPv6
- IPv6 extension headers and fragmentation

## Sources Consulted
- Wireshark Display Filter Reference: Internet Protocol Version 6 — https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark Display Filter Reference: Fragment Header for IPv6 — https://www.wireshark.org/docs/dfref/i/ipv6.fraghdr.html
- Wireshark Display Filter Reference: Routing Header for IPv6 — https://www.wireshark.org/docs/dfref/i/ipv6.routing.html
- Wireshark Display Filter Reference: Internet Control Message Protocol v6 — https://www.wireshark.org/docs/dfref/i/icmpv6.html
- TShark manual page — https://www.wireshark.org/docs/man-pages/tshark.html
- pcap-filter manual page — https://www.wireshark.org/docs/man-pages/pcap-filter.html
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc8200
- RFC 4443: Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification — https://www.rfc-editor.org/rfc/rfc4443
- RFC 5095: Deprecation of Type 0 Routing Headers in IPv6 — https://www.rfc-editor.org/rfc/rfc5095
- RFC 6275: Mobility Support in IPv6 — https://www.rfc-editor.org/rfc/rfc6275.html
- RFC 8754: IPv6 Segment Routing Header (SRH) — https://www.rfc-editor.org/rfc/rfc8754.html

## Issues Found
- The post used legacy Wireshark fragment-header field names such as `ipv6.fragment.id`, `ipv6.fragment.offset`, and `ipv6.fragment.more`. I updated these to current `ipv6.fraghdr.*` fields so the filters and `tshark -e` examples match current Wireshark documentation.
- The post treated `ipv6.nxt == <value>` and `ip6[6] == <value>` as if they always found a given extension header anywhere in the header chain. I clarified the `ipv6.nxt` examples as base-header checks, replaced the "has extension headers" display filter with explicit protocol-presence filters, and added `ip6 protochain` capture-filter examples where chasing the IPv6 header chain is required.
- The fragment BPF example used the wrong byte offset for the IPv6 Fragment Header M flag (`ip6[48]`). I corrected it to `ip6[43]` for the case where the Fragment Header immediately follows the IPv6 header, matching the RFC 8200 header layout.
- The reassembly example filtered on the IPv4 field `ip.reassembled_in` and used `ipv6.reassembled_length`. I corrected these to the IPv6 fields `ipv6.reassembled.in` and `ipv6.reassembled.length`; I also added `-2` so TShark can calculate reassembly dependencies correctly.
- The connectivity-debugging example used `host 2001:db8::server`, which is not a valid IPv6 literal. I replaced it with the valid documentation address `2001:db8::1`.
- The coloring-rule and packet-selection examples used `ipv6.fragment` where the current packet-level fragment-header presence filter is `ipv6.fraghdr`. I updated those examples accordingly.

## Review Notes
- `ip6 protochain` is the accurate way to match extension headers deeper in the IPv6 header chain in libpcap capture filters, but the `pcap-filter` manual notes that it is more complex and can be slower than simple fixed-offset checks.
- The remaining `ipv6.nxt == ...` examples are now explicitly described as checks against the base IPv6 header's Next Header field, which avoids overstating what they match.
- Local syntax checks were also run with `tcpdump` 4.99.4 and `libpcap` 1.10.4. The invalid `host 2001:db8::server` filter failed to parse as expected, and the corrected BPF examples compiled successfully.
