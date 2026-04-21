# Validation Summary: How to Investigate TCP Connections Stuck in CLOSE_WAIT

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP connection states
- Linux socket diagnostics
- iproute2 `ss`
- Linux `/proc` file descriptor inspection
- `strace`
- `lsof`
- Python socket handling
- Java thread dumps

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `proc_pid_fd(5)` manual page: https://man7.org/linux/man-pages/man5/proc_pid_fd.5.html
- Linux `proc_pid_status(5)` manual page: https://man7.org/linux/man-pages/man5/proc_pid_status.5.html
- Linux `proc_pid_limits(5)` manual page: https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html
- Linux `proc_sys_fs(5)` manual page: https://man7.org/linux/man-pages/man5/proc_sys_fs.5.html
- Linux `getrlimit(2)` manual page: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- Linux `recv(2)` manual page: https://man7.org/linux/man-pages/man2/recv.2.html
- Linux `close(2)` manual page: https://man7.org/linux/man-pages/man2/close.2.html
- Linux `strace(1)` manual page: https://man7.org/linux/man-pages/man1/strace.1.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- GNU Bash `ulimit` documentation: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
- Oracle `jstack` command documentation: https://docs.oracle.com/en/java/javase/14/docs/specs/man/jstack.html
- Oracle HotSpot Ctrl-Break handler documentation: https://www.oracle.com/java/technologies/javase/tool-descriptions.html
- `lsof` manual page: https://lsof.readthedocs.io/en/stable/manpage/

## Issues Found
- The `ss -tn state close-wait | wc -l` command counted the `ss` header line, so it could report `1` even when there were no CLOSE_WAIT sockets. Changed it to `ss -Htn state close-wait | wc -l`, and made the same fix in the `watch` command.
- The post described `FDSize` from `/proc/<pid>/status` as current FD usage, but Linux documents it as the number of allocated file descriptor slots. Replaced it with `grep "Max open files" /proc/<pid>/limits` for limits and `ls -1 /proc/<pid>/fd | wc -l` for current open descriptor count.
- The FD limit section grouped `ulimit -n` under system-wide limits even though it reports the current shell's per-process limit. Updated the heading/comment to distinguish process and system-wide limits.
- The `lsof -p <pid> | wc -l` example included the `lsof` header in the count. Changed it to `lsof -p <pid>` as an inspection command.
- The Python context-manager example said it automatically calls `close()` on exit for a generic database connection. Since a context manager only guarantees its cleanup protocol, and specific database libraries may not close on context exit, changed the comment to say to use a context manager that closes on exit.

## Review Notes
- The main TCP explanation is correct: RFC 9293 defines CLOSE-WAIT as waiting for the local user/application to close after receiving the peer's termination request.
- `ss -p`, `/proc/<pid>/fd`, and `strace -p` output/attach behavior can depend on process ownership and system permissions.
- `ss -K` is Linux/iproute2-specific and the manual documents support for IPv4 and IPv6 sockets; it should remain an emergency cleanup step, not the primary fix.
