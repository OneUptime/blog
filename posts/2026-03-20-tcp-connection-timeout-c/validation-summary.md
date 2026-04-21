# Validation Summary: How to Handle TCP Connection Timeouts in C Socket Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- POSIX sockets
- IPv4
- TCP
- `SO_RCVTIMEO` and `SO_SNDTIMEO`
- Non-blocking `connect()`
- `select()`
- `fcntl(O_NONBLOCK)`
- POSIX signals

## Sources Consulted
- POSIX.1-2024 `connect()` documentation: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/functions/connect.html
- POSIX.1-2024 `setsockopt()` documentation: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/functions/setsockopt.html
- POSIX.1-2024 `recv()` documentation: https://pubs.opengroup.org/onlinepubs/9799919799/functions/recv.html
- POSIX.1-2024 socket option behavior in 2.10.16 Use of Options: https://pubs.opengroup.org/onlinepubs/9799919799/functions/V2_chap02.html
- POSIX.1-2024 `<netinet/in.h>` documentation: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/basedefs/netinet_in.h.html
- Linux `socket(7)` manual page: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `connect(2)` manual page: https://man7.org/linux/man-pages/man2/connect.2.html
- Linux `select(2)` manual page: https://man7.org/linux/man-pages/man2/select.2.html
- Linux `recv(2)` manual page: https://man7.org/linux/man-pages/man2/recv.2.html
- Linux `send(2)` manual page: https://man7.org/linux/man-pages/man2/send.2.html
- Linux `signal(7)` manual page: https://man7.org/linux/man-pages/man7/signal.7.html
- Local verification with `gcc -std=c11 -Wall -Wextra -pedantic`.

## Issues Found
- The non-blocking `connect()` example used IPv4 socket address types and `uint16_t` without explicitly including the documented headers for them. Added `#include <netinet/in.h>` for `struct sockaddr_in` / `htons()` and `#include <stdint.h>` for `uint16_t`.
- The `getsockopt(SO_ERROR)` calls ignored the return value, which could incorrectly treat a failed `getsockopt()` call as a successful connection check. Updated the full example and short snippet to check the return value before using `SO_ERROR`.
- The conclusion said `SO_RCVTIMEO` and `SO_SNDTIMEO` calls return `-1` with `EAGAIN` / `EWOULDBLOCK` when the timeout passes. POSIX and Linux document that this is true only when no data was transferred; if some data was transferred first, the call returns the byte count. Updated the conclusion to include that distinction.
- The timeout summary described `alarm()` / `SIGALRM` as applying to any blocking call. Signal interruption depends on the interface and restart behavior such as `SA_RESTART`. Updated the table to describe it as applying to blocking calls that are interruptible by signals and noted the `EINTR` / `SA_RESTART` caveat.

## Review Notes
- The main non-blocking connect flow is correct: set `O_NONBLOCK`, handle `EINPROGRESS`, wait for writability, then read `SO_ERROR` to determine success or the real connect error.
- The two full C examples compile cleanly with GCC using `-std=c11 -Wall -Wextra -pedantic`.
- The examples remain intentionally compact and do not check every production-grade failure path, such as `socket()`, `setsockopt()`, `inet_pton()`, and `fcntl()` failures in every case.
