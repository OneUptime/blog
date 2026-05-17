# Validation Summary: How to Use strace to Debug Process System Calls on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- strace (Linux system call tracer)
- Ubuntu / Linux system administration
- Linux system calls (openat, getdents64, close, futex, select, epoll_wait, connect, socket, brk, mmap, write, etc.)
- systemd / systemctl (referenced in practical example)
- ltrace (mentioned as a complement)
- Shell utilities (pgrep, grep, timeout)

## Sources Consulted
- strace(1) man page and `strace --help` output (verified against strace 6.8)
- Local execution of strace to verify flag behavior (-f, -ff, -t, -tt, -r, -c, -s, -p, -o, -e trace=...)
- Verification of trace group aliases (`file`, `network`, `process`) - confirmed all three are accepted by current strace
- Verification of negation syntax `-e trace=\!syscall1,syscall2` - confirmed
- strace project documentation: https://strace.io/
- systemd / systemctl behavior - systemctl is a D-Bus client that requests service starts from PID 1 (systemd), which performs the actual fork/exec

## Issues Found

1. **Misleading practical example using `systemctl start myservice` under strace** (line 224, before fix). Running `strace -ff systemctl start myservice` only traces the `systemctl` binary, which sends a D-Bus message to PID 1 (systemd) and exits. The service process is forked and exec'd by systemd, not by systemctl, so the `-ff` (follow-forks) flag does not reach the service. A user following this example would grep an empty/irrelevant trace and waste time. **Fix applied:** Changed the example to invoke the service binary directly (`/usr/bin/myservice --config ...`), with a short inline note about why `systemctl start` does not work for this purpose. This is the standard, working approach when debugging service startup with strace.

## Review Notes

- The post uses the older unprefixed group aliases (`file`, `network`, `process`) rather than the modern `%file`, `%net`, `%process` forms. The unprefixed names still work in current strace (verified locally on 6.8) but are documented as deprecated. Not changed since they still function correctly and changing them was beyond the scope of fixing errors.
- The cited "5-10x slowdown for CPU-intensive processes" overhead estimate is on the low end for syscall-heavy workloads (where overhead can exceed 100x), but is a reasonable rough figure for general use. Left as-is.
- The `pgrep nginx | head -1` pattern returns the first PID alphabetically/numerically, not necessarily the master process. For nginx the master usually has the lowest PID, so this typically works, but `pgrep -o nginx` (oldest) or specifically `cat /run/nginx.pid` would be more reliable. Not a technical error, just a suggestion for future revisions.
- Description of `futex(...)` blocks as "waiting for a mutex" is a simplification - futex is also used to implement condvars, semaphores, and other userspace synchronization primitives - but it is accurate enough for the diagnostic context being described.
- The example `-c` summary output uses plausible but synthetic numbers that don't sum to 100% (correctly, since only the top 3 rows are shown). Not an issue.
