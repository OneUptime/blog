# Validation Summary: How to Inspect IPv6 Packet Headers with tcpdump

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- `tcpdump`
- libpcap / pcap filter syntax
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- DHCPv6
- IPv6 extension headers

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://datatracker.ietf.org/doc/rfc8200/
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://datatracker.ietf.org/doc/rfc8415/
- The Tcpdump Group libpcap filter syntax source (`pcap-filter`) - https://github.com/the-tcpdump-group/libpcap/blob/master/pcap-filter.manmisc.in
- The Tcpdump Group `tcpdump` man page source - https://github.com/the-tcpdump-group/tcpdump/blob/master/tcpdump.1.in
- Local `tcpdump --help`, `tcpdump(8)`, and `pcap-filter(7)` output
- Local `tcpdump -d` compilation checks for the filter expressions used in the post

## Issues Found
- The Traffic Class filter was incorrect. IPv6 Traffic Class is split across the low 4 bits of byte 0 and the high 4 bits of byte 1, so `ip6[1] = 0xB8` was not a correct exact-match filter. I replaced it with `(ip6[0:2] & 0x0ff0) == 0x0b80`.
- The Flow Label filter used `ip6[1:3]`, but libpcap packet data accessors only support 1, 2, or 4-byte loads. I corrected it to `(ip6[0:4] & 0x000fffff) != 0`.
- The ICMPv6 type examples used `ip6[40]` without noting that this assumes no IPv6 extension headers ahead of ICMPv6. I added that constraint to the comment.
- The Hop Limit example comment implied `ip6[7] == 255` was itself an NDP filter. I clarified that it is useful when checking NDP because valid Neighbor Discovery packets must have Hop Limit 255.
- The "Watch all NDP traffic" filter omitted ICMPv6 Redirect (type 137), which is part of Neighbor Discovery. I added type 137 to the filter.
- The DHCPv6 explanation overstated packet addressing behavior. Initial client messages commonly use a link-local source and `ff02::1:2` destination, but DHCPv6 is not universally link-local-to-multicast for all exchanges. I narrowed the wording and used the RFC-defined multicast group name.
- The extension-header capture examples used `ip6[6] == 44` and `ip6[6] == 43`, which only match when the Fragment or Routing Header is the immediate Next Header in the base IPv6 header. I corrected those examples to `ip6 protochain 44` and `ip6 protochain 43` so they match those headers anywhere in the IPv6 header chain.

## Review Notes
- `ip6 protochain` is the more technically correct way to match extension headers across the IPv6 header chain, but libpcap documents it as more complex and potentially slower than simple fixed-offset filters.
- The post still uses some fixed-offset examples intentionally; those are accurate for the specific base-header fields shown, but extension headers can change where upper-layer fields appear.
