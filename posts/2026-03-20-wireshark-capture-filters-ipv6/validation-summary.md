# Validation Summary: How to Use Wireshark Capture Filters for IPv6

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Wireshark
- tshark
- tcpdump
- Berkeley Packet Filter (BPF) / libpcap capture-filter syntax
- IPv6 protocol
- ICMPv6 (including Neighbor Discovery / RS / RA / NS / NA / Echo)
- DHCPv6 (UDP 546/547)

## Sources Consulted
- `pcap-filter(7)` man page (libpcap/tcpdump capture-filter syntax reference)
- `tcpdump(1)` man page
- `tshark(1)` man page / Wireshark User's Guide (capture filter, ring buffer, autostop options)
- Wireshark wiki: CaptureFilters page (https://wiki.wireshark.org/CaptureFilters)
- RFC 4443 (ICMPv6) - type numbers (128/129 echo, 133/134 RS/RA, 135/136 NS/NA)
- RFC 8415 (DHCPv6) - UDP ports 546 (client) and 547 (server)
- IANA Protocol Numbers (Next Header 58 = ICMPv6)

## Issues Found
- **Invalid BPF byte-access size in the "/64 prefix" example.** The original filter used `ip6[8:8] == 20:01:0d:b8:00:00:00:00 && ip6[16:8] != 00:00:00:00:00:00:00:01`. Per `pcap-filter(7)`, the size in the `proto[offset:size]` form "can be either one, two, or four"; size 8 is not supported. Additionally, BPF arithmetic expressions require integer constants (C-style, e.g., `0x20010db8`), not colon-separated byte strings. The second clause also did not match the "/64 prefix" comment (it excluded an unrelated interface-ID value). Replaced the example with the standard libpcap form `net 2001:db8::/64`, which is the documented and idiomatic way to filter an IPv6 subnet in BPF.

## Review Notes
- `ip6 proto 58` is correct for matching ICMPv6 directly after the IPv6 header, and the post's `ip6[40] == <type>` expressions correctly rely on the fixed 40-byte IPv6 header. Both assume no IPv6 extension headers are present; the `pcap-filter(7)` page explicitly notes that `ip proto`/`ip6 proto` primitives "do not chase the protocol header chain". For full robustness against extension headers, `ip6 protochain 58` or the `icmp6` alias could be used, but these are slower and disable kernel filtering. The post's usage is acceptable for typical on-wire ICMPv6 traffic.
- Similarly, `tcp[tcpflags] & tcp-syn` against an IPv6 packet will only work when no extension headers precede the TCP header. This is a well-known BPF limitation and not an error in the post.
- `tshark -b filesize:10240` is in kilobytes per the tshark man page, so the "10MB each" comment is accurate.
- ICMPv6 type numbers (128, 129, 133, 134, 135, 136) and DHCPv6 ports (546, 547) are verified against RFC 4443 and RFC 8415 respectively.
- `2001:db8::/32` is the documentation prefix per RFC 3849, so the example addresses are appropriate.
