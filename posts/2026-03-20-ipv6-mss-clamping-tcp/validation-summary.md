# Validation Summary: How to Use TCP MSS Clamping for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- TCP Maximum Segment Size (MSS)
- Path MTU Discovery (PMTUD)
- `ip6tables` / Netfilter `TCPMSS`
- `nftables`
- `tcpdump`
- Python

## Sources Consulted
- `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `nft(8)` / nftables man page: https://netfilter.org/projects/nftables/manpage.html
- Netfilter nftables wiki, "Mangling packet headers": https://wiki.netfilter.org/wiki-nftables/index.php/Mangling_packet_headers
- RFC 6691, "TCP Options and Maximum Segment Size (MSS)": https://www.rfc-editor.org/rfc/rfc6691
- RFC 8201, "Path MTU Discovery for IP version 6": https://www.rfc-editor.org/rfc/rfc8201.html
- RFC 4459, "MTU and Fragmentation Issues with In-the-Network Tunneling": https://www.rfc-editor.org/rfc/rfc4459
- `pcap-filter(7)` man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The tunnel walkthrough omitted the inner IPv6 and TCP headers when calculating packet size. I corrected the arithmetic so the unclamped case shows a 1500-byte inner packet becoming a 1520-byte outer packet, and the clamped case shows a 1480-byte inner packet becoming a 1500-byte outer packet.
- The post described MSS negotiation in the wrong direction. I corrected the explanation to reflect that each host limits what it sends based on the MSS advertised by its peer, which is why clamping is commonly applied in both directions.
- The `tcpdump` examples used `tcp[13] == 2`, which is not correct for IPv6 transport-header arithmetic in libpcap filters. I replaced those examples with IPv6-safe capture commands using `ip6 protochain 6` and MSS inspection from the handshake output.
- The `--clamp-mss-to-pmtu` comment was too specific about reading the PMTU cache, and the nftables persistence example implied `nftables.service` was universal. I tightened both to match the documented behavior more closely.
- The scenario table presented tunnel MTUs as if they were universal defaults. I added a note that they are example effective MTUs and vary by protocol and configuration.

## Review Notes
- The `iptables-extensions(8)` documentation notes that `--clamp-mss-to-pmtu` can behave unexpectedly on asymmetric paths because the kernel uses its own routing view for source and destination PMTU calculations.
- The commands remain current, but on many modern Linux distributions `ip6tables` is running on top of the `nf_tables` backend rather than the legacy xtables backend.
