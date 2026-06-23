# Validation Summary: How to Capture and Analyze IPv6 Packets with Wireshark

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 (protocol, addressing, extension headers)
- Wireshark (display filters, capture/BPF filters, statistics)
- ICMPv6 and Neighbor Discovery Protocol (NDP)
- BPF (libpcap) capture filter syntax
- TCP/UDP/DNS/DHCPv6 over IPv6
- IPv6 tunneling (6in4, Teredo, ISATAP)
- Linux/macOS networking CLI (ip, ifconfig, ping6, netstat)

## Sources Consulted
- Wireshark Display Filter Reference — IPv6 fields: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark Display Filter Reference — ICMPv6 fields: https://www.wireshark.org/docs/dfref/i/icmpv6.html
- RFC 8200 (IPv6 specification — header format, Next Header values, extension headers)
- RFC 4443 (ICMPv6 — message types 1–4, 128/129)
- RFC 4861 (Neighbor Discovery — RS/RA/NS/NA/Redirect types 133–137, DAD)
- RFC 5095 (deprecation of Type 0 Routing Header)
- IANA ICMPv6 Type Numbers and IP Protocol Numbers registries
- pcap-filter(7) man page (BPF capture filter syntax: ip6, icmp6, ip6 host/net/multicast)

## Issues Found
- **Invalid Wireshark display filter field `icmpv6.nd.ra.prefix`** (in the "Filter for specific RA options" block). This field does not exist in the Wireshark display filter reference. The advertised prefix in a Router Advertisement is carried in the Prefix Information option and exposed as `icmpv6.opt.prefix` (type: IPv6 address). Changed the line `icmpv6.nd.ra.prefix == 2001:db8::/64` to `icmpv6.type == 134 and icmpv6.opt.prefix == 2001:db8::/64`, matching the style of the two preceding filters in the same block and correctly restricting the match to Router Advertisements.

## Review Notes
- All ICMPv6 type numbers are correct: 1 (Destination Unreachable), 2 (Packet Too Big), 3 (Time Exceeded), 4 (Parameter Problem), 128/129 (Echo Request/Reply), 133–137 (RS/RA/NS/NA/Redirect).
- All Next Header / extension header values are correct: 0 (Hop-by-Hop), 43 (Routing), 44 (Fragment), 50 (ESP), 51 (AH), 58 (ICMPv6), 60 (Destination Options), 6 (TCP), 17 (UDP).
- The extension-header chaining example is logically consistent — each header's Next Header value points to the following header in the chain.
- Verified valid Wireshark fields: `ipv6.flow`, `ipv6.fraghdr.offset`, `ipv6.nxt`, `ipv6.tclass`, `ipv6.hlim`, `ipv6.src/dst/addr`, `icmpv6.opt.type`, `icmpv6.nd.ns.target_address`, and the `tcp.analysis.*` fields. CIDR-prefix comparisons on IPv6 address fields (e.g. `ipv6.src == fe80::/10`) are supported.
- BPF capture-filter primitives (`ip6`, `icmp6`, `ip6 host/net/multicast`, `ip.proto == 41`, `udp.port == 3544`) are valid.
- `ping6` is still functional but is deprecated on modern Linux in favor of `ping -6` (iputils). Left as-is since it remains widely available and works on both Linux and macOS; not a technical error.
- The "over 45%" Google IPv6 adoption figure is consistent with Google's published IPv6 statistics for the 2024–2026 period.
- The IPv6 header field-size table (Version 4 bits, Traffic Class 8, Flow Label 20, Payload Length 16, Hop Limit 8, addresses 128) matches RFC 8200.
