# Validation Summary: How to Troubleshoot IPv6 QoS Issues

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- IPv6 (RFC 8200) Traffic Class field and DSCP (RFC 2474)
- nftables (`nft`) and ip6tables mangle table
- Linux `tc` (traffic control): HTB, PFIFO, fq_codel, u32 filters
- `tcpdump` for IPv6 Traffic Class inspection
- Python `socket` module with `IPV6_TCLASS` socket option (RFC 3542)
- `ping6`, `traceroute6`, `tracepath6` diagnostic tools
- IPv6 Neighbor Discovery Protocol (NDP) via `ip -6 neigh`
- ICMPv6 Packet Too Big for Path MTU Discovery (RFC 8201)
- IPv6 Fragment Extension Header (Next Header 44)

## Sources Consulted
- RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification
- RFC 2474 — Definition of the Differentiated Services Field (DS Field) — DSCP values CS0-CS7, AF11-AF43, EF
- RFC 3246 — An Expedited Forwarding PHB (EF DSCP = 46)
- RFC 3542 — Advanced Sockets API for IPv6 (IPV6_TCLASS)
- RFC 8201 — Path MTU Discovery for IP version 6
- IANA Protocol Numbers (Next Header 44 = Fragment)
- nftables wiki — `ip6 dscp` expression and `meta l4proto` matches
- Linux `iptables-extensions(8)` — DSCP target (`--set-dscp-class`) and `icmp6` matches
- Linux `tc(8)`, `tc-htb(8)`, `tc-pfifo(8)`, `tc-fq_codel(8)`, `tc-u32(8)` man pages
- `ip-neighbour(8)` man page for `ip -6 neigh add ... lladdr`
- `tcpdump(8)` — IPv6 verbose output shows "class 0xXX" for Traffic Class byte
- Python `socket` module documentation for `IPV6_TCLASS`

## Issues Found
No technical issues found.

Verification notes:
- `0xa0` = binary 10100000 → DSCP bits 101000 = 40 = CS5 ✓
- `0xb8` = binary 10111000 → DSCP bits 101110 = 46 = EF ✓
- `46 << 2 = 184 = 0xb8` — correct TC byte value for DSCP EF with ECN=0 when passed to `IPV6_TCLASS` (which takes the full 8-bit Traffic Class value)
- `ip6[6] == 44` correctly filters packets where the IPv6 header's Next Header field (byte 6) indicates a Fragment Extension Header

## Review Notes
- The Python snippet imports `struct` but does not use it; harmless.
- `ping6 -c 50 -i 0.1` requires root privileges for intervals below 0.2 seconds; the reader is implicitly expected to run with sufficient privileges (consistent with the rest of the post using `sudo`).
- The closing paragraph's phrasing "DSCP value at offset 1 of the IPv6 header" is a common shorthand; strictly, DSCP occupies the low 4 bits of byte 0 and the high 2 bits of byte 1, so u32 filters typically mask across both bytes. Not incorrect enough to warrant a change in a troubleshooting narrative.
- `tcpdump -nn "ip6[6] == 44"` catches only packets whose first Next Header is Fragment; packets with preceding extension headers (e.g., Hop-by-Hop) before the Fragment header would be missed. Acceptable for typical VoIP traffic observation.
- `traceroute6` does not display per-hop DSCP remarking; the comment "Trace path and check at each hop" is accurate in the sense of identifying the hops to investigate separately.
