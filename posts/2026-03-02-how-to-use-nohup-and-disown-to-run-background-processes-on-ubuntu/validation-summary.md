# Validation Summary: How to Use nohup and disown to Run Background Processes on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- nohup (GNU coreutils)
- disown (bash builtin)
- bash job control (bg, fg, jobs, Ctrl+Z)
- SIGHUP signal handling
- POSIX shell I/O redirection
- pgrep / ps process inspection
- Ubuntu Linux

## Sources Consulted
- GNU coreutils `nohup` manual: https://www.gnu.org/software/coreutils/manual/html_node/nohup-invocation.html
- Bash Reference Manual — Job Control Builtins (`disown`, `bg`, `fg`, `jobs`): https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html
- POSIX `nohup` specification: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/nohup.html
- `bash(1)` man page (`shopt huponexit`, SIGHUP propagation behavior)
- `pgrep(1)` man page (Ubuntu procps-ng)
- `kill(1)` / `kill(2)` man pages (signal 0 semantics)

## Issues Found
- **Line 127–128:** The comment `# Disown and remove from job list (prevents "Done" messages)` incorrectly described the behavior of `disown -h %1`. The `-h` flag does *not* remove the job from the job table — it keeps the job in the table and marks it so SIGHUP is not sent on shell receipt of SIGHUP. This also contradicted the post's own correct explanation a few sections later. Fixed the comment to `# Mark job to ignore SIGHUP but keep it in the job list`, which matches the actual `bash(1)` behavior.

## Review Notes
- The statement that backgrounded jobs "will receive SIGHUP when the shell exits" is a common simplification. In modern bash, `shopt huponexit` is OFF by default, so SIGHUP is only propagated to jobs when bash itself receives SIGHUP (e.g., terminal/SSH disconnect), not on a clean `exit`. The end-user result is the same in the disconnect scenario the post is targeting, so this was left as-is.
- `disown` accepting PIDs (e.g., `disown 12345`) is supported in modern bash (4.0+) and is fine on Ubuntu's default bash versions.
- The `nohup` output message ("nohup: ignoring input and appending output to 'nohup.out'") and the rule about redirecting to `nohup.out` only when stdout/stderr is a terminal match GNU coreutils behavior.
- `kill -0 $PID` correctly tests whether the signal can be delivered without actually sending one — appropriate for the liveness check shown.
- Wrapper script's use of `$!` after `nohup "$@" > ... 2>&1 &` correctly returns the command's PID because GNU `nohup` exec's the target rather than forking.
