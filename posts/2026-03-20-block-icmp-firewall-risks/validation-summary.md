# Validation Summary: How to Block ICMP on a Firewall and Understand the Risks

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP (ICMPv4)
- Linux `iptables`
- Linux `nftables`
- Path MTU Discovery (PMTUD)
- `tracepath`
- `tcpdump`

## Sources Consulted
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- RFC 5905, Network Time Protocol Version 4: Protocol and Algorithms Specification: https://www.rfc-editor.org/rfc/rfc5905.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `nft` man page from Netfilter: https://netfilter.org/projects/nftables/manpage.html
- `tracepath(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tracepath.8.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- Local command validation: `iptables -p icmp -h`, `ping -h`, `tracepath -h`, `nft --help`, `tcpdump -d 'icmp[0]=3 and icmp[1]=4'`

## Issues Found
- The introduction incorrectly said that blocking ICMP breaks time synchronization. I changed this to ping-based monitoring and traceroute, because NTP uses UDP port 123 rather than ICMP.
- The table and conclusion said health checks stop working in general. I narrowed this to ICMP-based health checks, which is the technically accurate scope of the claim.
- The `nftables` example used `table inet` with `policy drop` even though the snippet only defined IPv4 ICMP handling. I changed it to `table ip` with `policy accept` so the example matches the IPv4-focused post and does not imply dropping unrelated traffic when copied as shown.
- The PMTUD test section used `ping -s 1400 -M do` and claimed that a timeout proved Type 3 Code 4 was blocked. That was not a reliable validation method. I replaced it with `tracepath`, which is designed to discover path MTU, and kept the `tcpdump` filter as a direct way to observe ICMP Type 3 Code 4 traffic.
- The OUTPUT-chain example said the host would be hidden from scanners and that essential outbound errors were still allowed. I rewrote the comments to the narrower, accurate claim: the rule suppresses echo replies, while other outbound ICMP still depends on the existing OUTPUT policy.

## Review Notes
- The post is now technically sound for IPv4/ICMP. If it is expanded later, it should add a separate ICMPv6 note because ICMPv6 filtering has different operational requirements and cannot be treated the same way as ICMPv4.
