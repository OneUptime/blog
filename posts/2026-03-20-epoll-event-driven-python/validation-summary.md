# Validation Summary: How to Build an Event-Driven IPv4 Server Using epoll in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Linux `epoll`
- Python `select` module
- TCP/IP networking over IPv4
- Event-driven server design

## Sources Consulted
- Python `select` documentation: https://docs.python.org/3/library/select.html
- Python `selectors` documentation: https://docs.python.org/3/library/selectors.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Linux `epoll(7)` manual page: https://man7.org/linux/man-pages/man7/epoll.7.html
- Linux `select(2)` manual page: https://man7.org/linux/man-pages/man2/select.2.html
- Linux `poll(2)` manual page: https://man7.org/linux/man-pages/man2/poll.2.html

## Issues Found
- The opening explanation overstated `epoll` as scaling to "millions" of file descriptors in `O(1)` time. I changed this to the documented behavior: `epoll` supports level-triggered and edge-triggered operation and is designed to scale well to large numbers of watched file descriptors.
- The comparison table incorrectly labeled `poll` and `epoll` as having "unlimited" file descriptor capacity and listed `epoll` scan cost as `O(1)`. I corrected the table to reflect the documented `FD_SETSIZE` limit for `select()` on Linux, the lack of an `FD_SETSIZE` limit for `poll()`/`epoll()`, and the fact that `epoll` avoids rescanning all watched descriptors.
- The edge-triggered example used an imprecise readiness-transition comment and included an unused `errno` import. I clarified the readiness-state wording and the fact that Python exposes the `EAGAIN`/`EWOULDBLOCK` case as `BlockingIOError` in this example.
- The conclusion stated that `selectors.DefaultSelector` maps to a fixed set of backends and otherwise falls back to `select`. I corrected this to Python's documented behavior: it chooses the most efficient implementation available on the current platform.

## Review Notes
- The main server example is technically valid as a minimal level-triggered `epoll` echo server.
- A basic local runtime check confirmed the sample loop can accept a connection and echo data back.
- For production code, explicit handling for cases such as `EPOLLERR` and more comprehensive shutdown/cleanup would still be advisable.
