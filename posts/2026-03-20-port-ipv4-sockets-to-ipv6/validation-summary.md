# Validation Summary: How to Port IPv4 Socket Applications to IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 and IPv6 socket APIs
- C socket programming
- POSIX/BSD socket calls (`socket`, `bind`, `listen`, `accept`, `connect`)
- Name and service resolution with `getaddrinfo()`
- Linux verification tools: `ss` and `nc`

## Sources Consulted
- RFC 3493: Basic Socket Interface Extensions for IPv6: https://www.rfc-editor.org/rfc/rfc3493
- POSIX Issue 8 networking interfaces and IPv6/IPv4 compatibility notes: https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html
- POSIX `accept()`: https://pubs.opengroup.org/onlinepubs/9699919799/functions/accept.html
- POSIX `inet_ntop()` and `inet_pton()`: https://pubs.opengroup.org/onlinepubs/9699919799/functions/inet_ntop.html
- Linux `getaddrinfo(3)`: https://man7.org/linux/man-pages/man3/getaddrinfo.3.html
- Linux `ipv6(7)`: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux `ss(8)`: https://man7.org/linux/man-pages/man8/ss.8.html
- Local CLI verification on Ubuntu 24.04: `ss --help`, `nc -h`, `gcc 13.3.0`, live `ss -tlnp -6` output, and a loopback `nc -6` connection test

## Issues Found
1. The `getaddrinfo()` server example bound only the first returned address and described that approach as “full portability”. `getaddrinfo()` returns a linked list of candidate addresses, and authoritative documentation expects applications to try the returned results in order. I changed the example to iterate through the list, bind the first usable address, and fail cleanly if `listen()` cannot start.
2. The conclusion said `getaddrinfo()` with `AF_UNSPEC` “automatically supports both IPv4 and IPv6 without separate code paths”. That is too strong for servers: portable server code may still need multiple bound sockets or an intentional dual-stack policy. I corrected the conclusion to reflect that behavior accurately.
3. The protocol-independent client loop did not handle `socket()` failure and used `result` unconditionally. I added the missing `socket()` failure check and guarded the loop so it runs only when `getaddrinfo()` succeeds.
4. The verification note claimed `ss` should show an `:::` prefix for IPv6 listeners. On current Linux `ss`, verified locally, an IPv6 wildcard listener is commonly shown in the IPv6 table as `*:PORT`. I updated the command to use `ss -tlnp -6` and corrected the explanation.
5. The IPv6 server comment implied that setting `IPV6_V6ONLY=0` simply “accepts IPv4”. I tightened that wording to describe IPv4-mapped connections on dual-stack platforms, which is closer to the standards language and Linux behavior.

## Review Notes
- The post is technically sound after correction. The direct-port examples remain intentionally simplified and still omit comprehensive production-style error handling, but the corrected best-practice section now matches the documented `getaddrinfo()` usage model.
- `IPV6_V6ONLY` behavior varies across platforms. Linux documents the default via `/proc/sys/net/ipv6/bindv6only`, while POSIX specifies IPv4 interoperability for AF_INET6 sockets via IPv4-mapped IPv6 addresses and allows implementations to accept IPv4 on an `in6addr_any` listener.
- I recompiled representative corrected C snippets with `gcc -Wall -Wextra` and verified the `ss` and `nc` command syntax locally.
