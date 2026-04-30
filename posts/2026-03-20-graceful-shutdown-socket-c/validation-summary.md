# Validation Summary: How to Handle Graceful Socket Shutdown and Close in C

## Status
validated

## Post Type
Guide

## Technologies Covered
- C
- POSIX sockets API
- IPv4
- TCP
- Signals
- `shutdown()`, `close()`, `accept()`, `send()`, `recv()`
- `SO_LINGER`

## Sources Consulted
- POSIX `recv()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/recv.html
- POSIX `sigaction()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/sigaction.html
- POSIX `signal()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/signal.html
- POSIX general interfaces and feature-test macros: https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html
- Linux `shutdown(2)`: https://man7.org/linux/man-pages/man2/shutdown.2.html
- Linux `socket(7)`: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `accept(2)`: https://man7.org/linux/man-pages/man2/accept.2.html
- Linux `send(2)`: https://man7.org/linux/man-pages/man2/send.2.html
- Linux `signal(7)`: https://www.man7.org/linux/man-pages/man7/signal.7.html
- Linux `signal(2)`: https://www.man7.org/linux/man-pages/man2/signal.2.html
- RFC 793, section 3.5, TCP connection close: https://datatracker.ietf.org/doc/rfc793/
- RFC 1122, section 4.2.2.13, normal close vs abort: https://www.rfc-editor.org/rfc/inline-errata/rfc1122.html

## Issues Found
- The `shutdown()` comparison table overstated `SHUT_RD` and `SHUT_RDWR`. I changed those entries to match POSIX/Linux semantics: they disallow receive/send operations, but `SHUT_RDWR` is not equivalent to a graceful `close()`, and the descriptor still has to be closed.
- The client and server `send()` examples assumed one `send()` call writes the full buffer. I added a small `send_all()` helper with `EINTR` handling because stream `send()` may complete with a short write.
- The `SO_LINGER` section described `l_linger = 0` too absolutely as “send RST immediately” and “skip TIME_WAIT”. I corrected this to the standard abortive-close behavior and removed the over-broad TIME_WAIT claim.
- The signal-driven shutdown example was not reliable as written: it used `signal()` while claiming `accept()` would wake with `EINTR`, omitted required headers, and used a non-ideal signal flag type. I changed it to `sigaction()` without `SA_RESTART`, used `volatile sig_atomic_t`, added the missing declaration for `handle_client()`, and added `_POSIX_C_SOURCE 200809L` so the snippet compiles cleanly under strict C11 on glibc.
- The server close comment implied synchronous flushing on `close()`. I revised that wording to match `socket(7)`: without linger, the close completes in the background.

## Review Notes
- Updated snippets were syntax-checked with `cc -std=c11 -Wall -Wextra -Werror`.
- The examples remain intentionally minimal and do not show exhaustive production error handling for every syscall or `SIGPIPE` suppression, but after correction the shutdown, close, signal, and linger behavior described in the post is technically accurate.
