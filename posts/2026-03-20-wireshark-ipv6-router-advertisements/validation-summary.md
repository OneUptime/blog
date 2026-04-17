# Validation Summary: How to Analyze IPv6 Router Advertisements in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark (display filters)
- tcpdump (BPF filter syntax)
- tshark
- ICMPv6 (types 133 Router Solicitation, 134 Router Advertisement)
- IPv6 Neighbor Discovery Protocol (NDP, RFC 4861)
- SLAAC (RFC 4862)
- RDNSS option (RFC 8106)

## Sources Consulted
- Wireshark ICMPv6 display filter reference: https://www.wireshark.org/docs/dfref/i/icmpv6.html
- RFC 4861 (Neighbor Discovery for IPv6): default timers (MaxRtrAdvInterval=600s, AdvDefaultLifetime=1800s)
- RFC 4862 (IPv6 Stateless Address Autoconfiguration): default valid/preferred lifetimes (2592000s / 604800s)
- RFC 8106 (IPv6 RA Options for DNS Configuration): RDNSS option type 25
- tcpdump pcap-filter man page: `icmp6[0]` BPF expression semantics

## Issues Found
1. **Incorrect Wireshark field name `icmpv6.nd.ra.pref_info.flag.a`** — This field does not exist in Wireshark's display filter reference. Prefix Information option fields live under the `icmpv6.opt.prefix.*` namespace. Replaced with the correct field `icmpv6.opt.prefix.flag.a` in the "Clients Not Getting IPv6 via SLAAC" section.

2. **Mismatched comment/filter for "Show RAs advertising a specific prefix"** — The original filter read `icmpv6.nd.ra.flag.m == 1`, which filters on the M flag, not on a prefix, and duplicated a later example. Changed the filter to `icmpv6.opt.prefix == 2001:db8:1::` so it matches the stated purpose and uses a valid Wireshark field.

## Review Notes
- All other Wireshark display filter fields used in the post (`icmpv6.type`, `icmpv6.nd.ra.flag.m`, `icmpv6.nd.ra.flag.o`, `icmpv6.nd.ra.router_lifetime`) are valid per the current Wireshark ICMPv6 reference.
- The ICMPv6 type numbers (133 RS, 134 RA) and option types (3 Prefix Information, 25 RDNSS) are correct per IANA / RFC 4861 / RFC 8106.
- Default values shown in the packet dissection (Hop Limit 64, Router Lifetime 1800s, Valid Lifetime 2592000s, Preferred Lifetime 604800s) align with RFC 4861 / RFC 4862 defaults.
- The "200-600 seconds" default RA interval range is a reasonable simplification; per RFC 4861 the strict defaults are MinRtrAdvInterval ≈ 198s (0.33 × 600) and MaxRtrAdvInterval = 600s.
- The `icmp6[0] == 134` BPF filter is valid but can miss packets when IPv6 extension headers are present before the ICMPv6 header; this is a known tcpdump limitation, not a post error.
- The `ipv6.src == fe80::/10` CIDR comparison in Wireshark display filters is supported in modern Wireshark releases.
