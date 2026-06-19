# Validation Summary: How to Handle Process Management with ps and kill

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux process management
- `ps`
- `kill` and Linux signals
- `pgrep` and `pkill`
- `killall`
- `top`, `htop`, and `watch`
- `nice`, `renice`, and `timeout`
- `lsof`
- Shell job control

## Sources Consulted
- `ps(1)` Linux manual page: https://man7.org/linux/man-pages/man1/ps.1.html
- `signal(7)` Linux manual page: https://man7.org/linux/man-pages/man7/signal.7.html
- `kill(1)` Linux manual page: https://man7.org/linux/man-pages/man1/kill.1.html
- `pgrep(1)` / `pkill(1)` Linux manual page: https://man7.org/linux/man-pages/man1/pgrep.1.html
- `killall(1)` Linux manual page: https://man7.org/linux/man-pages/man1/killall.1.html
- `timeout(1)` Linux manual page: https://man7.org/linux/man-pages/man1/timeout.1.html
- `nice(1)` Linux manual page: https://man7.org/linux/man-pages/man1/nice.1.html
- `renice(1)` Linux manual page: https://man7.org/linux/man-pages/man1/renice.1.html
- `top(1)` Linux manual page: https://man7.org/linux/man-pages/man1/top.1.html
- Local command help/man output for `ps`, Bash `kill`, `pgrep`, `pkill`, `killall`, and GNU `timeout`.

## Issues Found
- The `ps aux` flag explanation said `a` shows processes for all users. In procps `ps`, BSD `a` lifts the "only yourself" restriction for processes with a terminal; `a` combined with `x` is what produces the common all-process listing. Updated the comment to say `a` includes processes with a terminal from all users.
- The process-state table described `T` as stopped by signal or debugger. `ps(1)` distinguishes `T` for job-control stop and lowercase `t` for debugger tracing. Updated the table to include both states accurately.
- The `killall -u username` example said it logs the user out. `killall -u` sends a signal to processes owned by the user, which may log out their sessions but is not guaranteed to do so in every environment. Changed the wording to "may log them out."
- The zombie-process detection command matched only `STAT` exactly equal to `Z`. `ps` can show additional state modifiers such as `Z+`, so the command could miss zombies. Changed it to match `STAT` values beginning with `Z`.

## Review Notes
- Signal numbers such as `SIGTERM` 15, `SIGKILL` 9, `SIGSTOP` 19, and `SIGCONT` 18 are correct for common Linux architectures such as x86/ARM, but portable scripts should prefer signal names because some signal numbers vary by architecture.
- `killall` behavior differs on some non-Linux Unix systems; this post is explicitly Linux-focused, so the Linux `killall(1)` behavior is appropriate.
