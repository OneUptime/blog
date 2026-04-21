# Validation Summary: How to Understand struct sockaddr_in6 in C

## Status
validated

## Post Type
Tutorial / reference guide

## Technologies Covered
- C
- POSIX sockets
- IPv6
- `struct sockaddr_in6`
- `struct in6_addr`
- Network byte order conversion with `htons()`, `ntohs()`, `htonl()`, and `ntohl()`
- IPv6 text/binary address conversion with `inet_pton()` and `inet_ntop()`
- Interface indexes with `if_nametoindex()`

## Sources Consulted
- POSIX.1-2024 `<netinet/in.h>` specification: https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/netinet_in.h.html
- POSIX.1-2024 `<sys/socket.h>` specification: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/basedefs/sys_socket.h.html
- RFC 3493, Basic Socket Interface Extensions for IPv6: https://www.rfc-editor.org/rfc/rfc3493
- RFC 8200, Internet Protocol Version 6 specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 2474, Differentiated Services Field in IPv4 and IPv6 headers: https://datatracker.ietf.org/doc/rfc2474/
- RFC 3246, Expedited Forwarding PHB: https://datatracker.ietf.org/doc/html/rfc3246
- Linux `ipv6(7)` manual page for implementation behavior: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Local compile checks with `cc -Wall -Wextra -pedantic`

## Issues Found
- The `struct in6_addr` example showed `s6_addr16` and `s6_addr32` as if they were portable members. POSIX only guarantees `uint8_t s6_addr[16]`, so the example now shows only the portable member.
- The structure-size discussion treated `sockaddr_in6` as unconditionally 28 bytes and `sin6_family` as unconditionally 2 bytes. POSIX allows implementation-defined details, so the post now describes 28 bytes as a common/typical size and tells readers to use `sizeof`.
- The QoS example labeled `0x10` as DSCP EF. RFC 3246 allocates EF as DSCP `101110` (decimal 46), which is traffic class `0xb8` when ECN is zero. The example now uses `0xb8u << 20` and marks the mapping as platform-specific.
- The `IN6ADDR_ANY_INIT` example used it as an assignment expression. RFC 3493 specifies the initializer macro for declaration-time initialization, so the post now initializes a `struct in6_addr` variable at declaration and assigns that variable.
- The manual-byte example used `memcpy()` without including `<string.h>` and used a fixed length. The snippet now includes `<string.h>` and uses `sizeof addr.sin6_addr.s6_addr`.
- The IPv4 comparison table implied there are no possible extra IPv4 address-structure fields and that `INADDR_LOOPBACK` is POSIX-required. It now says no extra fields are required by POSIX and marks `INADDR_LOOPBACK` as a common extension.

## Review Notes
The complete usage example compiles cleanly on the local Linux environment with `cc -Wall -Wextra -pedantic`. Real production code should still check `inet_ntop()` and `if_nametoindex()` return values, and replace `"eth0"` with an interface name that exists on the target host.
