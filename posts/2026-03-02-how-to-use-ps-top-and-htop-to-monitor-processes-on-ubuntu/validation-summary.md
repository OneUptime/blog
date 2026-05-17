# Validation Summary: How to Use ps, top, and htop to Monitor Processes on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ps (procps-ng) — process status snapshot tool
- top (procps-ng) — real-time process viewer
- htop — interactive process viewer
- pgrep — process lookup utility
- /proc filesystem (resource limits)

## Sources Consulted
- procps-ng `ps(1)` man page: https://man7.org/linux/man-pages/man1/ps.1.html
- procps-ng `top(1)` man page: https://man7.org/linux/man-pages/man1/top.1.html
- htop man page: https://man.archlinux.org/man/htop.1.en
- procps-ng project: https://gitlab.com/procps-ng/procps
- htop project: https://htop.dev/ and https://github.com/htop-dev/htop
- Live verification against `ps` on Ubuntu (kernel 6.17) to confirm format specifiers

## Issues Found

1. **Invalid `ps` format specifier `rlimit`** — The example `ps -p 1234 -o pid,rlimit` does not work. Running it produces `error: unknown user-defined format specifier "rlimit"`. procps-ng does not expose a single `rlimit` keyword (only individual `rlimit_*` keywords exist in some procps-ng builds for specific fields). Replaced with the standard approach of reading `/proc/PID/limits`, which is the documented way to view a process's resource limits on Linux.

2. **htop F7/F8 keys were reversed** — The post described F7 as "Decrease priority (nice)" and F8 as "Increase priority (nice)". Per the htop man page, F7 decrements the nice value (which *increases* scheduling priority) and F8 increments the nice value (which *decreases* priority). Updated the entries to make the direction explicit and to note that going below nice 0 requires root.

3. **Mislabeled htop color legend** — The post listed colors (green/blue/red/yellow-orange) under "Color meanings in the process list", but those are the colors of the per-CPU usage bars at the top of htop, not the process list rows. Renamed the section to "per-CPU bars" and expanded to match the htop documented color mapping (blue=low priority, green=normal user, red=kernel, orange=IRQ, magenta=soft IRQ, grey=I/O wait).

## Review Notes

- The load-average description ("average number of runnable processes over 1, 5, and 15 minutes") is a common simplification — on Linux, load average also includes tasks in uninterruptible sleep (TASK_UNINTERRUPTIBLE / D state). Left as-is because it is a widely accepted simplification used in introductory material, but worth noting for a more advanced revision.
- "VSZ: Virtual memory size in kilobytes" is technically in 1024-byte units (KiB); the colloquial "kilobytes" is fine for this audience.
- "RSS — actual physical RAM used" is a reasonable simplification; RSS counts shared pages against every process that maps them, so summing RSS across processes overcounts memory. Out of scope for a fix here.
- `top -b -n 1 | tail -n +8` correctly skips the 7-line header block (5 summary lines + blank line + column header) in current procps-ng `top`.
- `ps axjf`, `ps --forest -eo …`, `ps -eo pid,lstart,etime,cmd`, and all `--sort=` examples were verified to work on a current Ubuntu system.
- `htop --sort-key PERCENT_CPU` and `htop -t` are valid per the htop CLI.
