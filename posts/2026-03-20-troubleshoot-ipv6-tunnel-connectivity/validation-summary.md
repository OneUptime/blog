# Validation Summary: How to Troubleshoot IPv6 Tunnel Connectivity Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 over IPv4 tunnels (6in4 / SIT, RFC 4213)
- GRE tunnels (RFC 2784)
- Linux `iproute2` (`ip link`, `ip -6 addr`, `ip -6 route`)
- `ping6`, `traceroute`, `tracepath6`
- `iptables` firewall rules
- `tcpdump` for ICMPv6 capture
- ICMPv6 (RFC 4443), Path MTU Discovery (RFC 8201)

## Sources Consulted
- RFC 4213 — Basic Transition Mechanisms for IPv6 Hosts and Routers (defines protocol 41 for 6in4): https://datatracker.ietf.org/doc/html/rfc4213
- RFC 2784 — Generic Routing Encapsulation (GRE), IP protocol 47: https://datatracker.ietf.org/doc/html/rfc2784
- RFC 4443 — ICMPv6 specification (Type 2 = Packet Too Big): https://datatracker.ietf.org/doc/html/rfc4443
- RFC 8200 — IPv6 specification (40-byte fixed header): https://datatracker.ietf.org/doc/html/rfc8200
- RFC 8201 — Path MTU Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc8201
- iproute2 manual pages (ip-link, ip-address, ip-route)
- iputils ping(8) and tracepath(8) man pages
- iptables(8) man page
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/

## Issues Found
- **Step 7 — incorrect IPv6+ICMPv6 header overhead**: The post stated "1500 - 28 for IPv6+ICMP headers" and used `ping6 -M do -s 1452` with the comment `1452 + 28 = 1480 (sit MTU)`. The 28-byte overhead applies to IPv4 (20-byte IPv4 header + 8-byte ICMP header), not IPv6. For IPv6, the overhead is 48 bytes (40-byte IPv6 fixed header per RFC 8200 + 8-byte ICMPv6 header per RFC 4443). To fill exactly a 1480-byte SIT tunnel MTU, the payload must be 1432, not 1452 (which produces a 1500-byte packet that exceeds the SIT MTU). Updated the comment to reference 48-byte overhead and changed `-s 1452` to `-s 1432` so the math (`1432 + 48 = 1480`) matches the stated SIT tunnel MTU.

## Review Notes
- `ping6` has been deprecated upstream in iputils since ~2018 in favor of `ping -6` (or just `ping` with auto-detection), but it remains available as a wrapper/symlink on virtually all current Linux distributions, so the existing usage still works for readers.
- The tcpdump filter `'icmp6 and ip6[40] == 2'` correctly matches ICMPv6 type 2 (Packet Too Big), since byte 40 of the IPv6 packet is the first byte of the ICMPv6 header (Type field).
- The example documentation prefix `2001:db8::/32` (RFC 3849) and example IPv4 `203.0.113.1` (RFC 5737 TEST-NET-3) are both correctly used.
- Protocol numbers (41 for 6in4, 47 for GRE) are correct per IANA assignments.
- The comment "Expected output: default via 2001:db8:1::2 dev sit1" in Step 3 is positioned just above the `ip -6 route get` command but better describes the output of `ip -6 route show`. This is a minor structural placement nit, not a technical error, so left as-is per the "do not make stylistic changes" instruction.
- SIT tunnel MTU of 1480 (1500 outer Ethernet MTU minus 20-byte IPv4 outer header) is correctly stated.
