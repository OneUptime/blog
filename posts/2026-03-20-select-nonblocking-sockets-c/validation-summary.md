# Validation Summary: How to Use the select() Function for Non-Blocking IPv4 Sockets in C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- POSIX sockets
- IPv4 TCP sockets
- `select()`
- Non-blocking I/O with `fcntl()` and `O_NONBLOCK`
- Netcat (`nc`) for testing

## Sources Consulted
- POSIX.1-2024 `select()` specification: https://pubs.opengroup.org/onlinepubs/9799919799/functions/select.html
- Linux man-pages `select(2)`: https://man7.org/linux/man-pages/man2/select.2.html
- Linux man-pages `fcntl(2)`: https://man7.org/linux/man-pages/man2/fcntl.2.html
- Linux man-pages `accept(2)`: https://man7.org/linux/man-pages/man2/accept.2.html
- Linux man-pages `recv(2)`: https://man7.org/linux/man-pages/man2/recv.2.html
- Linux man-pages `send(2)`: https://man7.org/linux/man-pages/man2/send.2.html
- Linux man-pages `poll(2)`: https://man7.org/linux/man-pages/man2/poll.2.html
- Linux man-pages `epoll(7)`: https://man7.org/linux/man-pages/man7/epoll.7.html
- OpenBSD `nc(1)` manual: https://man.openbsd.org/nc

## Issues Found
- The original post described non-blocking sockets, but the example never set `O_NONBLOCK`. Updated the server to set non-blocking mode with `fcntl()`, handle `EAGAIN`/`EWOULDBLOCK`, and use both read and write fd sets.
- The original code could pass accepted descriptors greater than or equal to `FD_SETSIZE` to `FD_SET`, which is undefined behavior. Added checks that close descriptors outside the `fd_set` range.
- The original echo path ignored partial sends and write readiness. Added per-client output state so pending echoes are sent when `select()` reports the socket writable.
- The original setup omitted important error handling for socket creation, binding, listening, and I/O calls. Added targeted checks so the sample fails clearly instead of continuing with invalid descriptors.
- The original `nc -q1` test command was implementation-specific. Replaced it with `nc -N`, which is documented by OpenBSD `nc` and supported by the local OpenBSD netcat build.
- The limitations section overstated `poll()` as having "unlimited fds" and `epoll()` as simply "O(1)". Revised the wording to say `poll()` avoids `FD_SETSIZE` and `epoll()` scales well for large fd sets.
- The original `select()` explanation omitted timeout expiration and signal interruption. Updated the description to include those return paths.

## Review Notes
The embedded server example was compiled with `gcc -Wall -Wextra` and smoke-tested with three local `nc -N` clients. The article is now technically correct for a compact tutorial, while still noting that `select()` is not suitable for high-connection-count servers.
