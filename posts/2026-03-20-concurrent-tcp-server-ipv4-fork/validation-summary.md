# Validation Summary: How to Build a Concurrent TCP Server for IPv4 Using Fork

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- Linux process control with `fork()`, `SIGCHLD`, and `waitpid()`
- IPv4 TCP sockets with `socket()`, `bind()`, `listen()`, and `accept()`
- Netcat (`nc`) for local testing

## Sources Consulted
- Linux `socket(2)` man page: https://man7.org/linux/man-pages/man2/socket.2.html
- Linux `listen(2)` man page: https://man7.org/linux/man-pages/man2/listen.2.html
- Linux `accept(2)` man page: https://man7.org/linux/man-pages/man2/accept.2.html
- Linux `fork(2)` man page: https://man7.org/linux/man-pages/man2/fork.2.html
- Linux `write(2)` man page: https://man7.org/linux/man-pages/man2/write.2.html
- Linux `wait(2)` man page: https://man7.org/linux/man-pages/man2/wait.2.html
- Linux `signal(2)` man page: https://man7.org/linux/man-pages/man2/signal.2.html
- Linux `sigaction(2)` man page: https://man7.org/linux/man-pages/man2/sigaction.2.html
- Local `nc -h` output for the installed OpenBSD netcat implementation

## Issues Found
- The assembled code did not compile cleanly because `waitpid()` and `WNOHANG` were used without including `<sys/wait.h>`, and `handle_client()` was called before it was declared. I added the missing headers and a function prototype.
- The echo loop used a single `write()` call, but `write(2)` can complete partially on sockets. I changed the handler to keep writing until all bytes from each `read()` call are sent back or an error occurs.
- The child process used `exit(0)` after `fork()`. I changed this to `_exit(0)` so the child does not run inherited stdio flushing and `atexit` handlers.
- The `SIGCHLD` section needed Linux-specific wording and a safer handler example. I clarified the text to say "On Linux" and updated the sample handler to preserve `errno` while reaping children.
- The setup snippet called `setsockopt()` and `listen()` without checking for failure. I added error handling so the example behaves as described.

## Review Notes
- The post is correctly scoped to Linux. The `SIGCHLD` behavior described for explicitly setting `SIG_IGN` should not be generalized to all historical UNIX variants.
- If the article is expanded later to show installing a real `SIGCHLD` handler, `sigaction(2)` is preferable to `signal(2)` for handler setup.
- After the fixes above, the assembled example compiled successfully with `gcc -std=c11 -Wall -Wextra`.
