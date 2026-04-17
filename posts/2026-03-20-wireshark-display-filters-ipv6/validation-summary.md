# Validation Summary: How to Use Wireshark Display Filters for IPv6

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark display filter language
- IPv6 (RFC 8200)
- ICMPv6 (RFC 4443)
- Neighbor Discovery Protocol / NDP (RFC 4861)
- Multicast Listener Discovery / MLD (RFC 2710 / RFC 3810)
- DHCPv6 (RFC 8415)
- DNS AAAA records (RFC 3596)
- tshark CLI

## Sources Consulted
- [Wireshark Display Filter Reference: IPv6](https://www.wireshark.org/docs/dfref/i/ipv6.html)
- [Wireshark Display Filter Reference: ICMPv6](https://www.wireshark.org/docs/dfref/i/icmpv6.html)
- [Wireshark User's Guide: Building Display Filter Expressions](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html)
- [wireshark-filter(4) Manual Page](https://www.wireshark.org/docs/man-pages/wireshark-filter.html)
- IANA ICMPv6 Type Numbers registry (verified types 1, 2, 3, 128–137)
- IANA DHCPv6 Message Types registry (verified Solicit=1, Advertise=2)
- DNS resource record TYPE values (verified AAAA = 28)

## Issues Found

1. **Invalid field name `ipv6.frag_offset`** (Troubleshooting Scenarios section)
   - The field `ipv6.frag_offset` does not exist in the Wireshark IPv6 dissector.
   - Changed to `ipv6.fraghdr.offset` (the current canonical field name for the IPv6 Fragment extension header offset).

2. **Incorrect `frame contains "2001:0db8"` filter** (Troubleshooting Scenarios section)
   - The `contains` operator with a quoted string searches for ASCII bytes in the raw frame. IPv6 addresses are stored as 16 binary bytes, so the ASCII text `"2001:0db8"` would never match an actual IPv6 address inside a Router Advertisement.
   - Changed to `icmpv6.opt.prefix == 2001:db8::`, which uses the dedicated dissector field for the prefix carried in an RA Prefix Information option.

3. **Unreliable link-local filter `ipv6.src_host starts_with "fe80"`** (Filtering by IPv6 Address section)
   - `ipv6.src_host` returns a resolved hostname when name resolution is enabled, so a `starts_with "fe80"` match is fragile.
   - Changed to `ipv6.src == fe80::/10`, which uses Wireshark's supported CIDR-prefix syntax and exactly matches the IPv6 link-local range (RFC 4291).

## Review Notes
- ICMPv6 type numbers (1, 2, 3, 128, 129, 130–132, 133–137) are all correct per the IANA ICMPv6 Type Numbers registry. Note that the post's MLD range (130–132) covers MLDv1 only; MLDv2 reports use type 143, but this is acceptable shorthand for the basic MLD message set.
- The `>=` / `<=` IPv6 comparison example in the "Filtering by IPv6 Address" section works in modern Wireshark versions, but the byte-slice example shown immediately after, plus the `ipv6.src == 2001:db8::/64` CIDR form, are more idiomatic — kept as-is to preserve author intent.
- DHCPv6 message-type numbers (Solicit=1, Advertise=2) are correct per RFC 8415.
- DNS query type 28 = AAAA is correct per IANA DNS RR TYPEs.
- tshark flags (`-r`, `-Y`, `-w`, `-T fields`, `-e`, `-E`) are all valid and current.
