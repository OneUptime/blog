# Validation Summary: How to Handle System Monitoring with top and htop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux system monitoring
- procps `top`
- `htop`
- Process and resource management commands (`ps`, `pgrep`, `free`, `nproc`, `watch`, `iotop`)
- Bash scripting

## Sources Consulted
- procps `top(1)` manual page: https://man7.org/linux/man-pages/man1/top.1.html
- `htop(1)` manual page: https://man7.org/linux/man-pages/man1/htop.1.html
- Linux `/proc/loadavg` manual page: https://man7.org/linux/man-pages/man5/proc_loadavg.5.html
- Local `top --help` and `top(1)` man page output from the review environment
- Local `ps(1)` and `pgrep(1)` man page output from the review environment

## Issues Found
- The `top` filter shortcut descriptions had `o` and `O` reversed. Updated `o` to case-insensitive filtering and `O` to case-sensitive filtering, matching `top(1)`.
- The `top` configuration path was listed only as `~/.toprc`. Updated the text to refer to the personal top rc file, usually `~/.config/procps/toprc` on modern procps, with `~/.toprc` noted as legacy behavior.
- The `htop` sorting shortcut list omitted `>` from the `F6` sort-column shortcuts. Updated it to `F6/</>`.
- The `htop` shortcut list described uppercase `C` as "Tag and kill". Current `htop(1)` documents lowercase `c` as tagging the current process and its children; killing tagged processes is done with `F9`/`k`. Updated the shortcut description.
- The comparison table said `top` has no horizontal scrolling and only filtering for process search. Current `top(1)` supports horizontal scrolling and string locate plus filtering, so the table was corrected.
- The load-average explanation equated load directly with CPU utilization. Linux load average includes runnable tasks and tasks waiting in uninterruptible disk I/O, so the wording was revised to describe it as a capacity heuristic rather than exact CPU utilization.

## Review Notes
The remaining examples are broadly correct for modern Linux/procps and current `htop`. Some interactive `htop` features and meters can vary by version, build options, platform, and installed helper tools such as `strace` and `lsof`.
