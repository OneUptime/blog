# Validation Summary: How to Understand the MTU Option in NDP

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Router Advertisement (RA) MTU Option (RFC 4861 Type 5)
- radvd (Router Advertisement Daemon)
- Linux IPv6 sysctls (`accept_ra_mtu`)
- ndisc6 / rdisc6 utility
- tcpdump filtering for ICMPv6
- Python `struct` module for binary protocol encoding/decoding

## Sources Consulted
- RFC 4861 (Neighbor Discovery for IP version 6), §4.6.4 "MTU" — https://datatracker.ietf.org/doc/html/rfc4861#section-4.6.4
- RFC 8200 (IPv6 Specification), §5 (minimum link MTU = 1280) — https://datatracker.ietf.org/doc/html/rfc8200#section-5
- RFC 2516 (PPPoE), header overhead (6-byte PPPoE + 2-byte PPP = 8 bytes) — https://datatracker.ietf.org/doc/html/rfc2516
- radvd man page / radvd.conf(5) — `AdvSendAdvert`, `AdvLinkMTU`, `prefix`, `AdvOnLink`, `AdvAutonomous`, `AdvValidLifetime`, `AdvPreferredLifetime`
- Linux kernel docs: `Documentation/networking/ip-sysctl.rst` (`accept_ra_mtu`)
- ndisc6 / rdisc6 documentation
- Python `struct` module documentation — https://docs.python.org/3/library/struct.html

## Issues Found
No technical issues found.

Verified items:
- Option format: Type=5, Length=1 (one 8-byte unit), 16-bit Reserved, 32-bit MTU — matches RFC 4861 §4.6.4.
- PPPoE effective MTU of 1492 = 1500 − 8 bytes (6-byte PPPoE header + 2-byte PPP protocol field) — correct per RFC 2516.
- IPv6 minimum MTU of 1280 bytes — correct per RFC 8200.
- All radvd directives used (`AdvSendAdvert`, `AdvLinkMTU`, `prefix`, `AdvOnLink`, `AdvAutonomous`, `AdvValidLifetime`, `AdvPreferredLifetime`) are valid.
- tcpdump BPF filter `icmp6 and ip6[40] == 134` correctly matches Router Advertisements (ICMPv6 type 134; offset 40 is the first byte after the fixed IPv6 header).
- `/proc/sys/net/ipv6/conf/<iface>/accept_ra_mtu` is a real Linux sysctl with the documented semantics.
- Python `struct.pack("!BBHI", 5, 1, 0, mtu)` produces exactly 8 bytes in network byte order matching the option layout.
- Parsing logic correctly extracts type (1B), length (1B), reserved (2B), and MTU (4B unsigned big-endian).

## Review Notes
- The 1280-byte minimum check in `build_mtu_option` is a reasonable sanity check, but technically RFC 4861 does not forbid advertising a smaller MTU value in the option; the IPv6 stack will simply not apply MTU values below the IPv6 minimum link MTU. The post's check aligns with practical operational guidance and is a defensive constraint, not a bug.
- The post correctly notes that all routers on a link must advertise consistent MTU values; RFC 4861 §6.2.4 explicitly requires this.
- `accept_ra_mtu` defaults to 1 on most modern Linux distributions; the comment "default on some distributions" is appropriately hedged.
