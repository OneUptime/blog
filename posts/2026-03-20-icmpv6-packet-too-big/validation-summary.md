# Validation Summary: How to Handle ICMPv6 Packet Too Big in Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMPv6
- IPv6 Path MTU Discovery (PMTUD)
- UDP and TCP socket behavior on Linux
- Python `socket` ancillary-data handling
- Linux networking tools: `ip`, `tcpdump`, `watch`

## Sources Consulted
- RFC 8201, "Path MTU Discovery for IP version 6": https://www.rfc-editor.org/rfc/rfc8201
- RFC 3542, "Advanced Sockets Application Program Interface (API) for IPv6": https://www.rfc-editor.org/rfc/rfc3542.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Linux `ipv6(7)` manual page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel IPv6 datagram handling (`net/ipv6/datagram.c`): https://codebrowser.dev/linux/linux/net/ipv6/datagram.c.html
- Linux kernel UDPv6 receive path (`net/ipv6/udp.c`): https://codebrowser.dev/linux/linux/net/ipv6/udp.c.html

## Issues Found
- The post said `IPV6_RECVPATHMTU` PTB information arrives as generic ancillary data on a normal UDP receive. On Linux, UDPv6 exposes it as a separate empty `recvmsg()` notification carrying `IPV6_PATHMTU` ancillary data. I corrected the explanation and the Python receive example to match Linux behavior.
- The Python ancillary-data parser decoded `ip6m_mtu` as network byte order and described the structure layout incorrectly. RFC 3542 and Linux headers define `ip6m_mtu` in host byte order, and `sockaddr_in6` is 28 bytes on Linux. I fixed the parser to use native byte order and corrected the structure comment.
- The PMTU retry example claimed to "get new PMTU from the route cache" but actually guessed by subtracting 8 bytes. That is not technically correct. I changed the example to connect the UDP socket for a single-destination flow and query the current PMTU from the kernel with `IPV6_MTU` after `EMSGSIZE`.
- The `ip` command examples used invalid placeholder IPv6 addresses such as `2001:db8::server` and `2001:db8::client`. I replaced them with valid documentation-prefix IPv6 addresses.
- The route-cache guidance was misleading for modern Linux. The post suggested flushing and watching a general PMTU cache, but `ip-route(8)` documents that generic route-cache behavior differently on modern kernels. I replaced that section with `ip -6 route get` examples that accurately reflect how to inspect a destination route and observe an `mtu` field when one is present.

## Review Notes
- The examples are Linux-specific. `IPV6_RECVPATHMTU`, `IPV6_PATHMTU`, `IPV6_DONTFRAG`, and `IPV6_MTU` behavior is not guaranteed to be identical on non-Linux platforms.
- Python exposes many socket constants only when the underlying platform headers define them. The revised examples use `getattr(..., fallback)` for Linux constant values to keep the code aligned with that behavior.
