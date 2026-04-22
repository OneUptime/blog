# Validation Summary: How to Use sendto() and recvfrom() for UDP Socket Communication in C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- POSIX sockets
- IPv4
- UDP
- `sendto()`
- `recvfrom()`
- Connected UDP sockets

## Sources Consulted
- POSIX.1-2024 `sendto()` documentation: https://pubs.opengroup.org/onlinepubs/9799919799/functions/sendto.html
- POSIX.1-2024 `recvfrom()` documentation: https://pubs.opengroup.org/onlinepubs/9799919799/functions/recvfrom.html
- Linux man-pages `connect(2)`: https://man7.org/linux/man-pages/man2/connect.2.html
- Linux man-pages `udp(7)`: https://man7.org/linux/man-pages/man7/udp.7.html
- RFC 768, User Datagram Protocol: https://www.rfc-editor.org/rfc/rfc768
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- RFC 894, IP Datagrams over Ethernet Networks: https://www.rfc-editor.org/rfc/rfc894

## Issues Found
- The conclusion said one `sendto()` of N bytes always arrives as one `recvfrom()` of N bytes or is dropped. This was too strong: UDP preserves datagram boundaries, but if the receive buffer is too small, `recvfrom()` returns a truncated datagram and discards the excess bytes. Updated the conclusion to describe one-datagram-at-a-time receive behavior and truncation.
- The conclusion described 1472 bytes as the maximum safe UDP payload over Ethernet. Updated this to specify a typical 1500-byte Ethernet IPv4 path with no IP options and noted that the actual safe size depends on path MTU.
- The `BUFSIZE` comment called 65507 the maximum UDP payload. Updated it to say maximum IPv4 UDP payload, since the value is derived from the IPv4 65,535-byte total length limit minus a 20-byte IPv4 header and 8-byte UDP header.
- The connected UDP comment implied `send()`/`recv()` must be used instead of `sendto()`/`recvfrom()` after `connect()`. Updated it to say `send()`/`recv()` can be used without passing the peer address each time, matching POSIX/Linux behavior.

## Review Notes
The server, client, and connected UDP snippets compile cleanly with `gcc -Wall -Wextra -fsyntax-only` when checked as C source. The examples intentionally omit full error handling for brevity; production code should check the return values from `socket()`, `bind()`, `setsockopt()`, `inet_pton()`, `sendto()`, and `connect()`.
