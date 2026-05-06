# Validation Summary: How to Build a Port Scanner Using IPv4 Sockets in C

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
- `getsockopt()`
- POSIX threads (`pthread`)
- GCC

## Sources Consulted
- Linux `socket(2)` manual page: https://www.man7.org/linux/man-pages/man2/socket.2.html
- Linux `connect(2)` manual page: https://man7.org/linux/man-pages/man2/connect.2.html
- Linux `select(2)` manual page: https://www.man7.org/linux/man-pages/man3/FD_SET.3.html
- Linux `getsockopt(2)` manual page: https://www.man7.org/linux/man-pages/man2/setsockopt.2.html
- Linux `inet_pton(3)` manual page: https://man7.org/linux/man-pages/man3/inet_pton.3.html
- Linux `pthread_create(3)` manual page: https://man7.org/linux/man-pages/man3/pthread_create.3.html
- GCC link options (`-pthread`): https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html

## Issues Found
- The introduction said the scanner used "raw sockets", but the code creates `SOCK_STREAM` TCP sockets. I corrected the wording to refer to POSIX sockets.
- The sequential scanner treated any writable non-blocking `connect()` as an open port. Per `connect(2)`, writability after `select()` is not sufficient; `getsockopt(SOL_SOCKET, SO_ERROR)` must be checked to distinguish success from failure. I fixed the connection logic accordingly.
- The original code ignored important error cases from `fcntl()` and `inet_pton()`, and it accepted invalid port ranges silently. I added minimal validation so the example behaves correctly for invalid IPv4 input and invalid ranges.
- The threaded example was not a complete standalone `portscan_threaded.c` even though the post showed a standalone compile-and-run command. I expanded the example so it includes the required scanner logic and `main()`.
- The threaded build command used `-lpthread`. I updated it to `-pthread`, which GCC documents as the correct option to use consistently for compilation and linking on supported targets.
- The conclusion said `select()` alone handled timeout-based connection probing. I corrected it to mention the required `getsockopt(SO_ERROR)` check.

## Review Notes
- I compiled corrected sequential and threaded versions locally with GCC 13.3.0 and verified runtime behavior against closed localhost ports and a temporary local HTTP server.
- The post remains Linux/POSIX-oriented. It is accurate for that scope, but it is not portable to Windows without Winsock-specific changes.
- `select()` is acceptable for this small example, but its `FD_SETSIZE` limits and general scalability tradeoffs mean `poll()` or `epoll()` would be stronger choices for larger single-threaded scanners.
