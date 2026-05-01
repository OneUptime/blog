# Validation Summary: How to Configure DSCP Marking for IPv6 Packets

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DSCP / DiffServ
- ip6tables
- nftables
- tc / iproute2
- tcpdump
- tshark / Wireshark
- Python 3

## Sources Consulted
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers" — https://www.rfc-editor.org/rfc/rfc2474
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" — https://www.rfc-editor.org/rfc/rfc8200
- `iptables-extensions(8)` — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- nftables man page — https://netfilter.org/projects/nftables/manpage.html
- `tc-pedit(8)` — https://www.man7.org/linux/man-pages/man8/tc-pedit.8.html
- `tc-u32(8)` — https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `tc-flower(8)` — https://www.man7.org/linux/man-pages/man8/tc-flower.8.html
- `pcap-filter(7)` — https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Wireshark Display Filter Reference for IPv6 — https://www.wireshark.org/docs/dfref/i/ipv6.html
- Local command help and validation: `ip6tables -j DSCP -h`, `ip6tables -m owner -h`, `tcpdump -d 'ip6 and (ip6[0:2] & 0x0fc0 == 0x0b80)'`

## Issues Found
- The `ip6tables` owner-match example was incorrect. `-m owner` is only valid for locally generated packets in `OUTPUT` or `POSTROUTING`, not `PREROUTING`, and `zoom` was not a portable valid owner value. I changed the rule to `OUTPUT` and used `--uid-owner "$(id -u)"` so the example resolves to a real UID.
- The nftables ICMPv6 rule used `ip6 nexthdr icmpv6`, which only matches when no IPv6 extension headers intervene. I changed it to `meta l4proto ipv6-icmp` so the example follows the documented extension-header-safe match.
- The `tc` section used `dsmark` incorrectly as if it were a filter action and paired it with a `u32` rewrite example that does not reflect the documented approach for editing the IPv6 Traffic Class byte. I replaced it with a `clsact` + `flower` + `pedit` example that rewrites the IPv6 Traffic Class field and preserves ECN bits with `retain 0xfc`.
- The `tcpdump` DSCP verification filter was wrong for IPv6 because the Traffic Class field is split across the first two header bytes. I replaced it with a working BPF expression that masks the DSCP bits correctly.
- The `tshark` field names were incorrect for IPv6. I changed the command from `ip6.*` / `ip.proto` fields to IPv6-specific field names.
- The opening and closing explanatory sentences were slightly imprecise. I tightened them to refer to DSCP bits in the IPv6 Traffic Class field and to Linux hosts/routers rather than only the traffic source.

## Review Notes
- The post is technically salvageable and now accurate after the fixes above.
- The `ip6tables` examples are still valid on modern Linux, but many systems implement them through the `nf_tables` backend; nftables is the native interface for new deployments.
- The `tshark` example assumes the Wireshark 2.0+ IPv6 field naming convention (`ipv6.tclass.dscp`).
