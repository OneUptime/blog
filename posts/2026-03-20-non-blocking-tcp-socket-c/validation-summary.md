# Validation Summary: How to Create a Non-Blocking TCP Socket in C

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- C programming language (POSIX socket API)
- POSIX `fcntl()` with `F_GETFL` / `F_SETFL` / `O_NONBLOCK`
- Linux-specific `SOCK_NONBLOCK` flag for `socket()` and `accept4()`
- IPv4 TCP sockets (`AF_INET`, `SOCK_STREAM`)
- Non-blocking I/O patterns for `recv()`, `send()`, `accept()`, `connect()`
- `select()` for waiting on socket writability
- `getsockopt()` with `SO_ERROR` for asynchronous connect verification
- Brief mention of `epoll` (edge-triggered) and `EPOLLOUT`

## Sources Consulted
- Linux man page accept(2) / accept4(2): https://man7.org/linux/man-pages/man2/accept.2.html
- Linux man page socket(2): https://man7.org/linux/man-pages/man2/socket.2.html
- Linux man page connect(2): https://man7.org/linux/man-pages/man2/connect.2.html
- Linux man page fcntl(2): https://man7.org/linux/man-pages/man2/fcntl.2.html
- Linux man page recv(2) and send(2)
- POSIX.1-2017 socket API specification

## Issues Found
No technical issues found. Specifically verified:
- `fcntl(fd, F_GETFL, 0)` followed by `fcntl(fd, F_SETFL, flags | O_NONBLOCK)` is the documented portable way to enable non-blocking mode.
- `SOCK_NONBLOCK` is OR-able into the `type` argument of `socket()` since Linux 2.6.27 — version statement is correct.
- `accept4()` signature `int accept4(int sockfd, struct sockaddr *addr, socklen_t *addrlen, int flags)` is correct, and `SOCK_NONBLOCK` is a valid flag (Linux 2.6.28 / glibc 2.10).
- Non-blocking `accept()` failing with `EAGAIN`/`EWOULDBLOCK` when no pending connections is documented behavior.
- `recv()` returning `-1` with `errno == EAGAIN`/`EWOULDBLOCK` on no data, and returning `0` on peer close, is correct.
- Non-blocking `send()` returning fewer bytes than requested or `EAGAIN` when the socket buffer is full is correct.
- Non-blocking `connect()` returning `-1` with `EINPROGRESS`, then waiting via `select()`/`poll()`/`epoll()` for writability, and verifying with `getsockopt(..., SO_ERROR, ...)` matches the documented pattern in connect(2).
- Comparison table entries (blocking vs non-blocking semantics for `recv`, `send`, `accept`, `connect`) are accurate.

## Review Notes
- `accept4()` is Linux-specific and requires `_GNU_SOURCE` (or `_DEFAULT_SOURCE`) to be defined for glibc to expose the prototype. The post does not mention this; portable code or non-Linux platforms (e.g., macOS) would need to fall back to `accept()` followed by `fcntl()` to set `O_NONBLOCK`.
- The `connect_nonblocking()` example omits `<sys/socket.h>`, `<unistd.h>` (for `close`), `<errno.h>`, and `<stdint.h>` (for `uint16_t`) from the visible includes; readers integrating the snippet will need to include them. This is typical for tutorial-style snippets and not technically incorrect.
- In `send_nonblocking()`, the `s == 0` case is not handled inside the `while (sent < len)` loop. Per POSIX, `send()` returning 0 on a stream socket with a non-zero buffer is unusual but technically allowed; the loop would not progress in that case. In practice on TCP this does not occur, so the example is fine for illustrative purposes.
- `EAGAIN` and `EWOULDBLOCK` are the same value on Linux but the post correctly checks both for portability.
- The `read_all()` helper reads into the same buffer position each iteration; the comment marks the spot where the caller would actually consume the bytes — readers should not copy this verbatim into a real receive path that needs to retain the data.
