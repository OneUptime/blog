# Validation Summary: How to Create IPv6 Capture Filters (BPF) in Wireshark

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Wireshark (capture filters)
- tcpdump
- Berkeley Packet Filter (BPF) / pcap-filter syntax
- IPv6 addressing and subnetting
- ICMPv6 and Neighbor Discovery Protocol (NDP)

## Sources Consulted
- pcap-filter(7) man page (libpcap filter syntax): https://www.tcpdump.org/manpages/pcap-filter.7.html
- tcpdump(1) man page: https://www.tcpdump.org/manpages/tcpdump.1.html
- Wireshark CaptureFilters wiki: https://wiki.wireshark.org/CaptureFilters
- RFC 4861 (Neighbor Discovery for IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4291 (IPv6 Addressing Architecture) for IPv6 text representation rules
- RFC 4443 (ICMPv6) for ICMPv6 message types

## Issues Found

1. **Invalid IPv6 addresses in examples** - Three example prefixes used non-hex characters in address groups, which would fail to parse as IPv6:
   - `2001:db8:servers::/64` (contains `s`, `r`, `v`) → changed to `2001:db8:5::/64`
   - `2001:db8:site1::/48` (contains `s`, `i`, `t`) → changed to `2001:db8:1::/48`
   - `2001:db8:clients::/64` (contains `l`, `i`, `n`, `t`, `s`) → changed to `2001:db8:c1e::/64`
   IPv6 hex groups are limited to 0-9 and a-f per RFC 4291. Verified via Python `ipaddress.IPv6Network()`.

2. **Misleading comparison table row** - The row `| Can be combined | With -F option | Yes |` was confusing and incorrect. The tcpdump `-F file` option reads a filter expression from a file; it does not combine filters. Replaced with `| Logical operators | and, or, not | and, or, not |`, which accurately describes both filter types.

## Review Notes

- The `tcp` / `udp` / `icmp6` primitive on IPv6 packets does not chase the extension header chain — packets with intermediate IPv6 extension headers can be missed. For such cases, `ip6 protochain 6` (TCP) or similar would be more robust. This is a known libpcap limitation and is fine to omit in an introductory guide.
- The `icmp6[0] == N` byte-offset syntax is used to match ICMPv6 types. The pcap-filter syntax also provides the named constant `icmp6[icmp6type]` (equivalent to `icmp6[0]`) and symbolic types like `icmp6-routeradvert`. Both forms are valid; the numeric form used in the post is widely understood.
- NDP message types 133–137 (Router Solicitation, Router Advertisement, Neighbor Solicitation, Neighbor Advertisement, Redirect) are correctly listed per RFC 4861.
- The duplicate `ip6` example under "Basic IPv6 BPF Capture Filters" (both "Capture all IPv6 traffic" and "Capture only IPv6 traffic (no IPv4)") is redundant but technically correct — left as-is to respect the author's structure.
- All tcpdump command syntax (`-i`, `-w`, quoted filter expression) is valid and current.
