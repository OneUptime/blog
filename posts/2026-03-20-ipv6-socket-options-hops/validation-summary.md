# Validation Summary: How to Set IPv6 Socket Options (IPV6_UNICAST_HOPS, IPV6_MULTICAST_HOPS)

## Status
validated

## Post Type
Guide

## Technologies Covered
- C
- POSIX / Linux socket programming
- IPv6
- IPv6 multicast
- `setsockopt()` / `getsockopt()`
- `recvmsg()` ancillary data
- DiffServ / IPv6 traffic class

## Sources Consulted
- RFC 3493, "Basic Socket Interface Extensions for IPv6" - https://datatracker.ietf.org/doc/html/rfc3493
- RFC 3542, "Advanced Sockets API for IPv6" - https://www.rfc-editor.org/rfc/rfc3542.html
- Linux `ipv6(7)` man page - https://www.man7.org/linux/man-pages/man7/ipv6.7.html
- RFC 4291, "IP Version 6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers" - https://datatracker.ietf.org/doc/html/rfc2474
- glibc header `/usr/include/netinet/in.h` on the local Ubuntu 24.04 environment, to verify `struct in6_pktinfo` exposure under GNU feature-test macros

## Issues Found
- The socket-option table listed `IPV6_PKTINFO` as the receive-enabling option for destination-address ancillary data. Per RFC 3542 and Linux `ipv6(7)`, the receive socket option is `IPV6_RECVPKTINFO`, while `IPV6_PKTINFO` is the ancillary data type and sticky packet-info option. I corrected the table entry.
- The multicast hop-limit section incorrectly mapped hop-limit ranges to multicast scopes such as node-local, link-local, and site-local. RFC 3493 defines the hop-limit range semantics, while RFC 4291 defines multicast scope in the destination multicast address. I corrected the explanation to separate hop limit from multicast scope.
- The traffic-class example described `0xB8` and `0x28` as DSCP values, but those are full 8-bit traffic-class octet values. RFC 2474 defines DSCP as the upper 6 bits of that octet. I corrected the wording and removed the inaccurate "highest priority" comment for EF.
- The traffic-class snippet was missing `<stdio.h>`, which is required for `printf()`. I added the missing include.
- The ancillary-data section heading said "Source Address", but `IPV6_PKTINFO` on receive exposes the destination IPv6 address and interface index, as described in RFC 3542. I corrected the heading.
- The ancillary-data snippet was missing `<string.h>` for `memcpy()`, and on current glibc `struct in6_pktinfo` is not exposed from `<netinet/in.h>` unless GNU feature-test macros are enabled. I added `#define _GNU_SOURCE` and the missing include so the example compiles on the local Linux/glibc toolchain.
- The final example was labeled "Ping-Like Application", but the code sends a UDP probe to port 33434 with a controlled hop limit, which is traceroute-style probing rather than ICMP echo. I corrected the heading/comment and added `<string.h>` for `memset()`.
- The conclusion said `IPV6_MULTICAST_HOPS` controls multicast scope and described the ancillary data as routing information. I corrected this to say it controls multicast hop limit, while scope comes from the multicast address, and that the ancillary data provides hop-limit and destination/interface information.

## Review Notes
- The corrected code snippets were compile-checked locally with `cc -Wall -Wextra -Werror` on the current Ubuntu 24.04 toolchain.
- Linux documents the multicast membership options as `IPV6_ADD_MEMBERSHIP` and `IPV6_DROP_MEMBERSHIP`, while glibc also exposes the RFC names `IPV6_JOIN_GROUP` and `IPV6_LEAVE_GROUP`. The post's table remains valid with the RFC names.
