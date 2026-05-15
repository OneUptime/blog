# Validation Summary: How to Diagnose Memory Leaks with Valgrind and /proc/meminfo on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Valgrind Memcheck
- Valgrind Massif
- Linux /proc filesystem
- /proc/meminfo
- /proc/<pid>/status
- /proc/<pid>/smaps_rollup
- pidstat
- dnf

## Sources Consulted
- Valgrind Memcheck manual: https://valgrind.org/docs/manual/mc-manual.html
- Valgrind Massif manual: https://valgrind.org/docs/manual/ms-manual.html
- Valgrind Quick Start Guide: https://valgrind.org/docs/manual/quick-start.html
- Linux proc_pid_status(5) manual: https://www.man7.org/linux/man-pages/man5/proc_pid_status.5.html
- Linux proc_meminfo(5) manual: local man page
- Linux kernel /proc filesystem documentation: https://www.kernel.org/doc/html/v6.5/filesystems/proc.html
- pidstat(1) manual: local man page
- pidof(8) manual: local man page
- Red Hat DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_software_with_the_dnf_tool/index

## Issues Found
- The introduction described `/proc/meminfo` as a direct leak-diagnosis companion to Valgrind. `/proc/meminfo` is system-wide memory information, while the post's per-process examples use `/proc/<pid>/status` and `/proc/<pid>/smaps_rollup`. Changed the wording to refer to the `/proc` filesystem for leak diagnosis.
- The post said Valgrind tracks every memory allocation. Memcheck specifically tracks heap blocks allocated by `malloc`, `new`, and related allocators. Changed this to "heap allocations."
- The Step 3 command used `--track-origins=yes` and said it shows which function allocated leaked memory. Valgrind documents `--track-origins=yes` as tracing uninitialized values, while leak allocation stack traces are produced by full leak checking and controlled by caller depth. Updated the command and explanation.
- The `/proc/<pid>/status` command used `pidof myapp` inline, which can produce multiple PIDs and break the `/proc/.../status` path. Updated the example to capture a single PID with `pidof -s myapp`.
- The `/proc/meminfo` grep pattern matched substrings such as `SwapCached` when looking for `Cached`. Anchored the expression to field names.

## Review Notes
The remaining examples are technically valid. `smaps_rollup` availability depends on kernel support, but current RHEL releases provide it. RSS growth is a useful leak signal, though continuous RSS growth can also come from allocator behavior, caches, or workload growth rather than a leak by itself.
