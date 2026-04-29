# Validation Summary: How to Handle IPv6 Scope IDs in Socket Programming

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and scoped addresses
- C socket programming (`sockaddr_in6`, `connect()`, `bind()`, `listen()`)
- POSIX network interface APIs (`if_nametoindex()`, `if_indextoname()`, `if_nameindex()`)
- Python `socket` module
- Linux IPv6 socket behavior

## Sources Consulted
- RFC 4007: IPv6 Scoped Address Architecture - https://datatracker.ietf.org/doc/html/rfc4007
- RFC 3493: Basic Socket Interface Extensions for IPv6 - https://datatracker.ietf.org/doc/html/rfc3493
- RFC 4193: Unique Local IPv6 Unicast Addresses - https://www.rfc-editor.org/rfc/rfc4193.html
- Python `socket` module documentation - https://docs.python.org/3.12/library/socket.html
- Linux `ipv6(7)` man page - https://www.man7.org/linux/man-pages/man7/ipv6.7.html
- Linux `if_nametoindex(3)` man page - https://man7.org/linux/man-pages/man3/if_nametoindex.3.html

## Issues Found
- The ULA row used `fd00::/8` as the full unique-local range. I changed it to `fc00::/7` because RFC 4193 assigns `fc00::/7` to ULAs; `fd00::/8` is the currently defined locally assigned half.
- The `%eth0` text form was presented as a generic text representation. I clarified that interface-name zone IDs are common on Unix-like systems, while RFC 4007 only requires support for numeric zone identifiers and treats other strings as implementation-dependent.
- The C `connect_link_local()` example documented `fe80::1%2` as valid text input but only converted zone IDs with `if_nametoindex()`, so numeric zone IDs would fail. I updated the example to accept either an interface name or a numeric zone ID and to reject link-local addresses that still have `sin6_scope_id == 0`.
- The C `connect_link_local()` example copied the address substring with `strncpy()` without checking the extracted length. I added a bounds check and switched to `memcpy()` for the bounded copy.
- The `bind_link_local_server()` example omitted error handling for `socket()`, `if_nametoindex()`, `inet_pton()`, `setsockopt()`, and `listen()`. I added those checks so the code matches the article’s described behavior.
- The Python section comment said it was using `%interface` notation, but the code actually uses the documented IPv6 4-tuple with a numeric `scope_id`. I corrected the comment.

## Review Notes
- RFC 4007’s zone-ID syntax applies broadly to non-global scoped addresses, but Linux `ipv6(7)` documents `sin6_scope_id` support primarily for link-local addresses; multicast workflows often also rely on `IPV6_MULTICAST_IF` and related multicast-specific APIs.
- I locally compiled the updated C examples with `cc -Wall -Wextra -Werror` and validated the Python snippet with Python 3 parsing.
- I also locally confirmed Linux behavior for link-local bind: binding a link-local IPv6 address without a scope ID failed with `EINVAL`, while binding with the interface index succeeded.
