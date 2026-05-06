# Validation Summary: How to Bind a Socket to a Specific IPv4 Address and Port in C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- POSIX sockets API
- IPv4
- TCP
- UDP
- Linux socket options (`SO_REUSEADDR`, `SO_REUSEPORT`)

## Sources Consulted
- POSIX `bind()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/bind.html
- POSIX `getsockname()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/getsockname.html
- POSIX `setsockopt()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/setsockopt.html
- POSIX `inet_pton()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/inet_pton.html
- Linux `socket(7)`: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `ip(7)`: https://man7.org/linux/man-pages/man7/ip.7.html

## Issues Found
- Added explicit `#include <netinet/in.h>` and `#include <stdint.h>` to the main example so `struct sockaddr_in` and `uint16_t` come from the correct headers instead of relying on transitive includes.
- Reworded the “specific NIC” example to “specific local IPv4 address” and noted that the address must exist on the host, because `bind()` binds to a local address and fails with `EADDRNOTAVAIL` if that address is not assigned locally.
- Corrected the `SO_REUSEADDR` explanation. The original text implied `bind()` would succeed whenever a port was in `TIME_WAIT`; Linux documents narrower reuse semantics and does not allow rebinding over an active listener.
- Corrected the `SO_REUSEPORT` explanation. The original text described round-robin distribution, but Linux documents more general load distribution and requires each socket to set the option before `bind()`. On Linux, the binders must also share the same effective UID.
- Corrected the conclusion’s port `0` explanation. Port `0` asks the kernel to choose an ephemeral port; it is appropriate when a client does not need a fixed source port, not when it needs a specific one.

## Review Notes
- `SO_REUSEPORT` is Linux-specific in the form described here and is not guaranteed by POSIX.
- The shorter `setsockopt()`/`bind()` examples are contextual snippets rather than full standalone programs; that is acceptable for this post format.
- The main `bind_socket()` example was compile-checked with `gcc -Wall -Wextra -std=c11` during review.
