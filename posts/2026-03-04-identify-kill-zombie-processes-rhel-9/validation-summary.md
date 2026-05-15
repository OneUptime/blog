# Validation Summary: How to Identify and Kill Zombie Processes on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux process management
- Zombie processes
- procps-ng tools: `ps` and `top`
- POSIX/Linux signals: `SIGCHLD`, `SIGKILL`, `SIGTERM`
- C process APIs: `wait()`, `waitpid()`
- Shell `wait`
- systemd service restart workflow

## Sources Consulted
- Linux `wait(2)` / `waitpid(2)` manual page: https://man7.org/linux/man-pages/man2/waitpid.2.html
- Linux `signal-safety(7)` manual page: https://man7.org/linux/man-pages/man7/signal-safety.7.html
- Linux `kill(2)` manual page: https://man7.org/linux/man-pages/man2/kill.2.html
- POSIX shell `wait` manual page: https://man7.org/linux/man-pages/man1/wait.1p.html
- Local procps-ng `ps(1)` manual page and `ps --help all`
- Local procps-ng `top(1)` help output
- Red Hat Customer Portal solution on zombie and uninterruptible processes: https://access.redhat.com/solutions/2972

## Issues Found
- The `ps aux | awk '$8 == "Z"'` examples matched only an exact `Z` process state. The procps-ng `ps` manual documents that the `STAT` field can contain additional BSD state characters, such as `Z+` or `Zs`, so the examples could miss zombies. Updated those checks to match states beginning with `Z`.
- Several `grep -w Z` examples searched the whole `ps` output line and could either miss state variants or match unrelated command text. Replaced them with `awk` checks against the `STAT` column.
- The detailed example used the `comm` output field while showing a defunct label. `comm` is the command name; the `<defunct>` marker is more appropriate with the command/args output. Updated the command to use `args` and adjusted the sample output.
- The post said orphaned zombies are adopted by PID 1 and immediately cleaned up. Linux documents adoption by `init(1)` or the nearest child subreaper. Updated the text to mention subreapers and use "normally clean it up" instead of guaranteeing immediacy.
- The C `SIGCHLD` handler called `waitpid()` without preserving `errno`. `waitpid()` is async-signal-safe, but `signal-safety(7)` notes that handlers using `errno` should save and restore it. Added `#include <errno.h>` and save/restore logic.
- The SIGCHLD cleanup method implied sending SIGCHLD always prompts a wait. Updated the wording to clarify that this depends on the parent handling that signal.

## Review Notes
The article is technically relevant and suitable for validation after the fixes. A future improvement would be to replace the simple `signal()` C example with a fuller `sigaction()` example, but the current snippet is syntactically valid and conveys the intended concept.
