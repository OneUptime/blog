# Validation Summary: How to Create IPv6 Sockets with AF_INET6 in C

## Status
validated

## Post Type
Guide

## Technologies Covered
- C
- POSIX sockets
- IPv6
- TCP
- UDP
- `AF_INET6`
- `getaddrinfo()`
- `netcat`

## Sources Consulted
- Linux `ipv6(7)` man page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux `inet_pton(3)` man page: https://man7.org/linux/man-pages/man3/inet_pton.3.html
- Linux `inet_ntop(3)` man page: https://man7.org/linux/man-pages/man3/inet_ntop.3.html
- RFC 3493, Basic Socket Interface Extensions for IPv6: https://www.rfc-editor.org/rfc/rfc3493
- The Open Group `inet_pton()` / `inet_ntop()` reference: https://pubs.opengroup.org/onlinepubs/009619199/inet_pton.htm
- The Open Group `getaddrinfo()` reference: https://pubs.opengroup.org/onlinepubs/009619199/getad.htm
- The Open Group `<stdint.h>` reference: https://pubs.opengroup.org/onlinepubs/009695399/basedefs/stdint.h.html
- The Open Group IPv6 socket option reference (`IPV6_V6ONLY`): https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html
- IANA Service Name and Transport Protocol Port Number Registry: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
- Local `nc -h` output for OpenBSD netcat option verification

## Issues Found
- The TCP server snippet used `memset()` and `inet_ntop()` without including `<string.h>` and `<arpa/inet.h>`. I added the missing headers so the example compiles cleanly as a standalone snippet.
- The client snippet used `uint16_t` without including `<stdint.h>`. I added the header in both the required-headers section and the client example so the type is declared by the standard header that defines it.
- The post description mentioned `IPV6_V6ONLY`, but the body did not explain the platform-dependent IPv4-mapped behavior of `AF_INET6` sockets or show the option. I added a brief explanation in the introduction and an explicit `IPV6_V6ONLY` example in the TCP server code.
- The comment for `sin6_scope_id` said `0 for global`, but the example binds `in6addr_any`, not a global unicast address. I corrected the comment to say `0` is used when no scoped address is involved.
- The UDP example used port `5353`, which IANA assigns to Multicast DNS. That can conflict with local mDNS services, so I changed the example to use an unprivileged application port instead.

## Review Notes
- The code uses direct `socket()`, `bind()`, `connect()`, and `recvfrom()` calls correctly for `AF_INET6`.
- The post’s portability advice about preferring `getaddrinfo()` with `AF_UNSPEC` is correct and aligns with the protocol-independent API described in RFC 3493 and The Open Group documentation.
- `IPV6_V6ONLY` defaults are platform-dependent. Linux commonly allows IPv4-mapped connections by default, while other systems may differ, so setting it explicitly is the right portability guidance.
