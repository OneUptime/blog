# Validation Summary: How to Handle Multiple Connections with epoll on Linux in C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- Linux sockets API
- `epoll`
- IPv4 TCP networking
- Non-blocking I/O

## Sources Consulted
- Linux man-pages project: `epoll(7)` https://www.man7.org/linux/man-pages/man7/epoll.7.html
- Linux man-pages project: `epoll_ctl(2)` https://www.man7.org/linux/man-pages/man2/epoll_ctl.2.html
- Linux man-pages project: `epoll_wait(2)` https://man7.org/linux/man-pages/man2/epoll_wait.2.html
- Linux man-pages project: `accept(2)` / `accept4()` https://www.man7.org/linux/man-pages/man2/accept4.2.html
- Linux man-pages project: `send(2)` https://man7.org/linux/man-pages/man2/send.2.html
- Linux man-pages project: `socket(2)` https://www.man7.org/linux/man-pages/man2/socket.2.html
- Local verification on 2026-05-01: compiled the sample with `gcc -Wall -Wextra -std=c11` and confirmed echo behavior over loopback.

## Issues Found
- The sample used `accept4()` without defining `_GNU_SOURCE`, which caused an implicit-declaration warning with the post's compile command. I added `#define _GNU_SOURCE` to match the documented feature-test requirement.
- The sample included an unused `set_nonblocking()` helper, which triggered an `-Wunused-function` warning under `-Wall -Wextra`. I removed it.
- The non-blocking echo loop called `send()` once and ignored short writes and `EAGAIN`, which can lose data on stream sockets. I replaced it with a buffered write path that tracks pending output and enables `EPOLLOUT` until all bytes are sent.
- The example combined that simplified echo logic with edge-triggered client sockets, but `epoll(7)` recommends continuing read and write operations until `EAGAIN` when using `EPOLLET`. I changed the example client registration to level-triggered mode so the tutorial code remains correct without introducing a larger output queue.
- The description and conclusion overstated `epoll` behavior by claiming blanket `O(1)` notification regardless of monitored descriptors and by presenting `EPOLLET` as the universal best-performance choice. I rewrote those lines to align with the man pages' ready-list model and the documented tradeoffs of edge-triggered mode.

## Review Notes
- The API overview table is accurate for current Linux man-pages.
- The compile command is valid after adding `_GNU_SOURCE` in the code sample.
- `accept4()`, `SOCK_NONBLOCK`, and `MSG_NOSIGNAL` are Linux-specific choices, which is consistent with the post's Linux scope.
