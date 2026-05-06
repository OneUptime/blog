# Validation Summary: How to Send and Receive Binary Data Over TCP Sockets in C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- POSIX sockets
- TCP over IPv4
- Binary message framing
- Network byte order

## Sources Consulted
- RFC 9293: Transmission Control Protocol: https://www.rfc-editor.org/rfc/rfc9293
- POSIX `recv()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/recv.html
- POSIX `send()`: https://pubs.opengroup.org/onlinepubs/000095399/functions/send.html
- POSIX `htonl()` / `ntohl()`: https://pubs.opengroup.org/onlinepubs/000095399/functions/htonl.html
- POSIX `inet_pton()` / `inet_ntop()`: https://pubs.opengroup.org/onlinepubs/9699919799/functions/inet_ntop.html
- POSIX socket/IP header guidance (`<sys/socket.h>`, `<netinet/in.h>`): https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html
- GCC packed type attribute documentation: https://gcc.gnu.org/onlinedocs/gcc/Common-Type-Attributes.html

## Issues Found
- `recvn()` and `sendn()` were described as reliable loop helpers, but they returned `-1` on `EINTR` instead of retrying. I added `errno == EINTR` retry handling to match POSIX `recv()`/`send()` behavior.
- The length-prefix snippet used `malloc()` and `free()` without including `<stdlib.h>`. I added the missing header.
- The sender and receiver examples were missing required headers for the symbols they use, including `sockaddr_in`, `htons`, `memcpy`, and `close`. I added the necessary includes.
- The receiver example declared `void *buf;` and then unconditionally called `free(buf)` even if `recv_message()` failed before initializing the pointer. I changed this to `void *buf = NULL;` so the cleanup path is defined.
- The struct example used `htobe64()` / `be64toh()` directly. In this environment those symbols were not declared under a strict C build without extra feature-test setup, so I replaced them with a self-contained `htonll()` / `ntohll()` helper built from `htonl()` / `ntohl()`.
- The conclusion now reflects that 64-bit byte-order conversion may require an equivalent helper and that `__attribute__((packed))` is compiler-specific rather than a portable C feature.

## Review Notes
- The examples still omit full return-value checking for brevity. Production code should check the results of `socket()`, `connect()`, `bind()`, `listen()`, `accept()`, `send_message()`, and `recv_message()`.
- On POSIX systems, `send()` on a broken stream socket can also raise `SIGPIPE` unless the program suppresses or handles it. That does not invalidate the framing discussion, but it is a production concern outside the post’s current scope.
