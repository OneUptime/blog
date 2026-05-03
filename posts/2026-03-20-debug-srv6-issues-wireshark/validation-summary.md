# Validation Summary: How to Debug SRv6 Issues with Wireshark

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6)
- IPv6 Segment Routing Header (SRH)
- Wireshark / tshark
- tcpdump (BPF filters)
- iperf3
- Linux seg6 networking (iproute2)
- ICMPv6

## Sources Consulted
- RFC 8754 — IPv6 Segment Routing Header (SRH): https://datatracker.ietf.org/doc/html/rfc8754
- RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification (Routing Header / Hdr Ext Len): https://datatracker.ietf.org/doc/html/rfc8200
- RFC 4443 — ICMPv6 (Type 4 Parameter Problem, Code 0 = Erroneous header field encountered): https://datatracker.ietf.org/doc/html/rfc4443
- RFC 9602 — IANA IPv6 Special-Purpose Address Registry: 5f00::/16 reserved for SRv6 SIDs: https://datatracker.ietf.org/doc/html/rfc9602
- IANA Protocol Numbers (43 = IPv6-Route): https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- Wireshark display filter reference for IPv6 (`ipv6.routing.type`, `ipv6.routing.seg_left`, `ipv6.routing.srh.sid`): https://www.wireshark.org/docs/dfref/i/ipv6.html
- tcpdump pcap-filter(7) man page (BPF `ip6 proto`, `net`): https://www.tcpdump.org/manpages/pcap-filter.7.html
- Linux kernel SRv6 (seg6) documentation: https://www.kernel.org/doc/html/latest/networking/seg6-sysctl.html

## Issues Found
- **Step 3 — SRH Hdr Ext Len inconsistent with Segment List size.** The example showed `Hdr Ext Len: 4 (4×8 + 8 = 40 bytes)` together with `Last Entry: 2` and three segments listed (Segment List[0]..[2]). Per RFC 8754/8200, total SRH length = `(Hdr Ext Len + 1) × 8`. With 3 segments (3 × 16 = 48 bytes) plus the 8-byte fixed header, total length is 56 bytes, requiring `Hdr Ext Len = 6`. A value of 4 (40 bytes) only fits 2 segments. Changed to `Hdr Ext Len: 6 (6×8 + 8 = 56 bytes)` so the value matches the rest of the example.

## Review Notes
- Protocol number 43 for the IPv6 Routing Header is correct per IANA.
- Routing Type 4 is the correct value for SRv6 SRH per RFC 8754.
- 5f00::/16 is the correct IETF-reserved SRv6 SID prefix per RFC 9602.
- ICMPv6 Type 4, Code 0 is correctly identified as a Parameter Problem / "erroneous header field encountered"; common SRv6 SRH parsing errors do surface this way. The informal label "Routing Header Problem" is not a formal ICMPv6 name but is intelligible in context.
- Segment List ordering (reverse, Segment List[0] is the final destination, Segment List[Last Entry] is the first/already-visited segment) and the relationship between Segments Left and the active SID match RFC 8754.
- The Wireshark display filter `ipv6.routing.srh.sid contains 5f00:2:3:` relies on Wireshark's byte-substring semantics for IPv6 fields. It works in practice for prefix-style matches, though `matches "^5f00:2:3:"` would be more explicit. Not changed since it is a stylistic choice and behaves correctly.
- The tcpdump `ip6 net 5f00::/16` BPF expression is supported by libpcap.
- Linux SRv6 inspection via `ip -6 route show | grep seg6` is correct for installations using the kernel seg6 / lwtunnel encap.
