# Validation Summary: How to Implement a Chat Application Using IPv4 Sockets in C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- POSIX sockets
- IPv4
- TCP
- `select()`
- GCC

## Sources Consulted
- The Open Group Base Specifications Issue 8, `<sys/select.h>`: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/basedefs/sys_select.h.html
- The Open Group Base Specifications Issue 8, `pselect(), select()`: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/functions/select.html
- The Open Group Base Specifications Issue 8, `socket()`: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/functions/socket.html
- The Open Group Base Specifications Issue 8, `connect()`: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/functions/connect.html
- The Open Group Base Specifications Issue 8, `send()`: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/functions/send.html
- The Open Group Base Specifications, `recv()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/recv.html
- The Open Group XNS, `inet_pton(), inet_ntop()`: https://pubs.opengroup.org/onlinepubs/009619199/inet_pton.htm
- GCC manual, Invoking GCC: https://gcc.gnu.org/onlinedocs/gcc/Invoking-GCC.html

## Issues Found
- Both code examples used `fd_set`, `FD_ZERO()`, `FD_SET()`, `FD_ISSET()`, and `select()` without including `<sys/select.h>`. I added the required header to both snippets so they compile correctly on a conforming system.
- The server could be terminated by `SIGPIPE` when broadcasting to a client that had already disconnected. I added `<signal.h>` and `signal(SIGPIPE, SIG_IGN)` so a dropped client does not kill the server process.
- The original code assumed each `send()` call transmitted the full buffer. POSIX specifies that `send()` returns the number of bytes actually sent, so I added a small `send_all()` helper to both snippets and used it for welcome messages, broadcasts, and client input.

## Review Notes
- The post is now technically correct as a simple blocking TCP chat tutorial.
- I compiled the extracted server and client examples with `gcc 13.3.0` using `-Wall -Wextra -Werror -std=c11`.
- I also ran a localhost smoke test with one server and two clients; the second client received the first client's chat message as described.
