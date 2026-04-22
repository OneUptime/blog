# Validation Summary: How to Set Socket Options (SO_REUSEADDR, SO_KEEPALIVE) in C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- POSIX sockets
- IPv4 TCP sockets
- `setsockopt()` and `getsockopt()`
- `SO_REUSEADDR`, `SO_KEEPALIVE`, `SO_SNDBUF`, `SO_RCVBUF`, `SO_RCVTIMEO`, `SO_SNDTIMEO`
- Linux TCP options `TCP_NODELAY`, `TCP_KEEPIDLE`, `TCP_KEEPINTVL`, and `TCP_KEEPCNT`

## Sources Consulted
- POSIX.1-2024 General Information, socket-level options: https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html
- POSIX `setsockopt()` reference: https://pubs.opengroup.org/onlinepubs/9699919799/functions/setsockopt.html
- Linux man-pages `getsockopt(2)` / `setsockopt(2)`: https://man7.org/linux/man-pages/man2/setsockopt.2.html
- Linux man-pages `socket(7)`: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux man-pages `tcp(7)`: https://man7.org/linux/man-pages/man7/tcp.7.html

## Issues Found
- The `get_opt()` helper ignored the return value from `getsockopt()` and could return an uninitialized integer on failure. Added a failure check, `perror("getsockopt")`, and `return -1`.
- The `SO_REUSEADDR` section implied that the option restarts "without TIME_WAIT". Updated the wording to explain that it allows restart while old connections are in `TIME_WAIT`; it does not remove `TIME_WAIT`.
- The send/receive buffer note was Linux-specific. Updated it to say Linux may report double the requested size.
- Timeout comments said `recv()` and `send()` return `EAGAIN`. Updated them to say the call returns `-1` with `EAGAIN` or `EWOULDBLOCK` if no data was transferred before the timeout.
- The conclusion described Nagle-related delay as a fixed 40 ms. Reworded it to "unwanted latency" because the exact delay is implementation- and workload-dependent.
- The conclusion described `SO_RCVTIMEO` and `SO_SNDTIMEO` as read/write deadlines. Reworded this to per-call read/write timeouts, matching POSIX/Linux behavior.

## Review Notes
The examples are short fragments rather than a complete program, so they still omit broader production concerns such as checking every `setsockopt()` call and checking `socket()` for failure. A compile-only syntax check of representative corrected fragments passed with `cc -Wall -Wextra -Werror -fsyntax-only`.
