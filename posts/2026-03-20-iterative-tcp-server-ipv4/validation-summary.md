# Validation Summary: How to Build an Iterative TCP Server for IPv4

## Status
validated

## Post Type
Tutorial / programming guide

## Technologies Covered
- IPv4
- TCP
- POSIX sockets in C
- Python `socket`
- OpenBSD `nc` / netcat

## Sources Consulted
- POSIX `listen()` specification: https://pubs.opengroup.org/onlinepubs/9799919799/functions/listen.html
- POSIX `accept()` specification: https://pubs.opengroup.org/onlinepubs/9799919799/functions/accept.html
- POSIX `send()` specification: https://pubs.opengroup.org/onlinepubs/9799919799/functions/send.html
- POSIX `recv()` specification: https://pubs.opengroup.org/onlinepubs/9799919799/functions/recv.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- OpenBSD `nc(1)` manual page: https://man.openbsd.org/nc.1
- Local Linux manual pages consulted for runtime behavior checks: `man 2 listen`, `man 2 accept`

## Issues Found
- The C example handled `recv()` errors the same way as an orderly client disconnect. POSIX documents `recv()` returning `0` for orderly shutdown and `-1` for error, so I added `if (n < 0) { perror("recv"); }` after the receive loop.
- The original `nc` test relied on default EOF behavior that varies by netcat implementation and did not reliably demonstrate iterative handling. I changed it to `nc -N` and explicitly held the first client open with `sleep 5`, so the second client is only handled after the first disconnects.
- The conclusion described queued connections as “the kernel backlog,” which is a loose shorthand. I reworded it to “kernel listen queue” and clarified that `backlog` bounds queued connections rather than acting as a concurrency limit, matching POSIX `listen()` semantics.

## Review Notes
The post is technically sound after these fixes and uses current, non-deprecated C and Python socket APIs. I validated the revised examples locally by compiling the C code with `cc -Wall -Wextra -Werror`, parsing the Python block successfully, and confirming that the updated `nc -N` test delays the second client until the first client disconnects. The `-N` flag is documented for OpenBSD netcat; other `nc` variants may use different EOF/shutdown flags.
