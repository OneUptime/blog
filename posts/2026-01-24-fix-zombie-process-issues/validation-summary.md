# Validation Summary: How to Fix 'Zombie Process' Issues in Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux process states and zombie processes
- procps-ng tools: `ps`, `top`, `watch`
- POSIX/Linux process waiting APIs: `wait()`, `waitpid()`
- Linux signals: `SIGCHLD`, `SIG_IGN`
- Bash job control and `wait`
- Python `subprocess` and `signal`
- Linux `prctl(PR_SET_CHILD_SUBREAPER)`
- systemd service settings

## Sources Consulted
- Linux `wait(2)` man page: https://man7.org/linux/man-pages/man2/wait.2.html
- Linux `sigaction(2)` man page: https://man7.org/linux/man-pages/man2/sigaction.2.html
- Linux `prctl(2)` man page: https://man7.org/linux/man-pages/man2/prctl.2.html
- procps-ng `ps(1)` man page: https://man7.org/linux/man-pages/man1/ps.1.html
- procps-ng `top(1)` man page: https://man7.org/linux/man-pages/man1/top.1.html
- systemd `systemd.service(5)` man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd `systemd.kill(5)` man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.kill.html
- systemd `systemd.resource-control(5)` man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- Bash `wait` builtin help output

## Issues Found
- Corrected zombie detection commands that used `ps aux | grep -w Z` or `grep -c " Z "`, which can produce false positives or miss some zombie state strings. Updated examples to filter the `STAT` field directly or count `ps -eo stat= | grep -c '^Z'`.
- Corrected the explanation that ignoring `SIGCHLD` causes zombies. On POSIX/Linux, explicitly setting `SIGCHLD` to `SIG_IGN` prevents zombie creation; the problematic case is failing to wait/reap after child termination.
- Replaced Bash examples using `PPID` as a variable name. `PPID` is readonly in Bash, so assignments or `read PPID` fail.
- Removed the inaccurate `Delegate=yes` subreaper example. `Delegate=` is for cgroup resource-control delegation, not for making a service a child subreaper.
- Fixed the C `SIGCHLD` example so it does not install a handler and then immediately overwrite it with `SIG_IGN`. Added the required `stddef.h` include for `NULL`, changed `main()` to `main(void)`, and handled the unused signal parameter.
- Wrapped the `PR_SET_CHILD_SUBREAPER` snippet in a valid `main(void)` function and kept the error-checking branch.
- Updated orphan/subreaper wording so orphaned processes and zombies are described as adopted by init or the nearest subreaper, matching Linux behavior.
- Added `Restart=on-failure` to the systemd watchdog example, because `WatchdogSec=` alone marks/terminates an unresponsive service but does not by itself configure restart behavior.

## Review Notes
The remaining examples are intentionally operational and should still be used carefully on production systems, especially commands that terminate parent processes. Brief zombies are normal; persistent accumulation usually indicates an application reaping bug or blocked parent.
