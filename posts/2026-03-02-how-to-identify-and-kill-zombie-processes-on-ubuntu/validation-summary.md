# Validation Summary: How to Identify and Kill Zombie Processes on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- Linux process management
- procps `ps`
- POSIX/Linux signals
- Bash process waiting
- systemd service management
- PHP-FPM
- Apache HTTP Server

## Sources Consulted
- Linux `wait(2)` manual: https://man7.org/linux/man-pages/man2/wait.2.html
- procps `ps(1)` manual: https://man7.org/linux/man-pages/man1/ps.1.html
- Linux `signal(7)` manual: https://man7.org/linux/man-pages/man7/signal.7.html
- Linux `/proc/sys/kernel/pid_max` documentation: https://man7.org/linux/man-pages/man5/proc_sys_kernel.5.html
- GNU Bash Reference Manual, Job Control Builtins: https://www.gnu.org/software/bash/manual/bash.html#Job-Control-Builtins
- PHP-FPM official manual: https://www.php.net/manual/en/install.fpm.php
- Apache HTTP Server 2.4 stopping and restarting documentation: https://httpd.apache.org/docs/current/en/stopping.html
- systemctl manual/help output for `status`, `reload`, and `restart`: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- Several commands used broad `grep` patterns such as `grep '[Z]'`, `grep 'Z'`, and `grep -c '^.*Z'`. These can match a capital `Z` anywhere in the command line instead of checking the process state. Updated them to inspect the `STAT` column with `ps -eo ... | awk '$3 ~ /^Z/'` or `ps -eo stat= | awk '$1 ~ /^Z/'`.
- The example for finding the parent process used the parent PID from the sample output but said to replace it with the zombie PID. Corrected the comment to say parent PID.
- The PID utilization command used `ps aux | wc -l`, which includes the header line and does not count threads. Updated it to `ps -eL --no-headers | wc -l` because Linux `pid_max` limits process and thread IDs.
- The Bash SIGCHLD example described `wait -n` as if it were a nonblocking reap loop. GNU Bash documents `wait -n` as waiting for the next child to complete. Replaced the trap-based loop with a `wait -n` loop that reaps children as they exit and stops when Bash reports no unwaited children.

## Review Notes
- The core explanation is correct: zombies are terminated child processes that remain until their parent waits for them, and they cannot be removed by sending `SIGKILL` directly to the zombie.
- The PHP-FPM reload note is consistent with PHP-FPM documentation that uses `SIGUSR2` for reload.
- Apache graceful restart guidance is consistent with Apache HTTP Server documentation for `apachectl -k graceful`/`apachectl graceful`.
