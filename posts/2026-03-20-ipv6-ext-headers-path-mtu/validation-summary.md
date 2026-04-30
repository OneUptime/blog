# Validation Summary: How to Understand the Impact of Extension Headers on Path MTU Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 extension headers
- IPsec ESP
- GRE tunneling
- Path MTU Discovery (PMTUD)
- Linux networking tools (`tracepath`, `ip`, `tcpdump`, `ip6tables`)
- Python

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 8201, "Path MTU Discovery for IP version 6": https://datatracker.ietf.org/doc/html/rfc8201
- RFC 4303, "IP Encapsulating Security Payload (ESP)": https://www.rfc-editor.org/rfc/rfc4303.html
- RFC 4106, "The Use of Galois/Counter Mode (GCM) in IPsec Encapsulating Security Payload (ESP)": https://www.rfc-editor.org/rfc/rfc4106.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `tracepath(8)` manual: https://man7.org/linux/man-pages/man8/tracepath.8.html
- Linux `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux `pcap-filter(7)` manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The post treated IPsec ESP and GRE as if they were IPv6 extension headers. I clarified that RFC 8200 defines a narrower set of IPv6 extension headers, while ESP and GRE still add per-packet overhead that reduces available payload size.
- The ESP overhead examples used incorrect fixed byte counts and omitted algorithm-specific fields such as the AES-GCM IV. I corrected the examples and Python snippet to use explicit illustrative AES-GCM assumptions and corrected the resulting MSS values.
- The tunnel-mode example incorrectly implied that a Fragment header is inherent to IPv6-in-IPv6 plus ESP tunneling. I removed that assumption and noted that a Fragment header only appears when source fragmentation is used.
- The PMTU inspection section used outdated or misleading Linux guidance, including `ip -6 route show cache | grep mtu` and the nonexistent `/proc/sys/net/ipv6/conf/all/path_mtu_discovery`. I replaced those with `tracepath -6`, `ip -6 route get`, and a correct `tcpdump` filter for ICMPv6 Packet Too Big messages.
- The minimum-MTU section incorrectly tied the 1280-byte minimum case to a mandatory jumbogram Hop-by-Hop header and described remaining bytes as application payload without distinguishing transport headers. I corrected that section to describe generic header overhead and to state that the remaining space is before transport headers.
- The conclusion stated an unconditional recommendation to always configure MSS clamping. I softened this to a technically accurate recommendation focused on TCP-carrying tunnel paths and `--clamp-mss-to-pmtu`.

## Review Notes
- ESP overhead remains transform- and padding-dependent. The numeric ESP examples are now explicitly marked as illustrative assumptions rather than universal constants.
- The `ip6tables` examples are still valid, though many modern Linux distributions implement them through the nftables compatibility layer.
