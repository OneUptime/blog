# Validation Summary: How to Monitor Swap Usage and Diagnose Memory Pressure on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux swap and memory management
- `free`, `vmstat`, `sar`, `top`, `ps`, `journalctl`, `dmesg`
- `/proc/meminfo`, `/proc/PID/status`, and PSI `/proc/pressure/memory`
- `sysstat`, `smem`, cron, shell scripting

## Sources Consulted
- Red Hat Customer Portal: How to use SAR to Monitor System Performance in Red Hat Enterprise Linux - https://access.redhat.com/solutions/276533
- Red Hat Enterprise Linux 9 documentation: Overview of performance monitoring options - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/overview-of-performance-monitoring-options
- Linux kernel documentation: PSI - Pressure Stall Information - https://kernel.org/doc/html/v6.0/accounting/psi.html
- Linux man-pages: proc_meminfo(5) - https://man7.org/linux/man-pages/man5/proc_meminfo.5.html
- Linux man-pages: proc_pid_status(5) - https://man7.org/linux/man-pages/man5/proc_pid_status.5.html
- Local system manual/help output for `free(1)`, `vmstat(8)`, `sar(1)`, `top(1)`, and `ps(1)`

## Issues Found
- Corrected the `vmstat` `si` and `so` descriptions. They were described as pages per second, but `vmstat` reports an amount of swapped memory per second, with the default display in KiB on typical procps-ng systems.
- Corrected the `vmstat` `free` description from a fixed kilobyte statement to the unit selected by `vmstat`, KiB by default.
- Corrected the high swap I/O threshold wording from pages/sec to KiB/sec for the default `vmstat` output.
- Corrected the explanation of swap `used` from "currently paged out" to "swap space currently allocated", because swapped pages can also be present in RAM as `SwapCached`.
- Clarified that the per-process script reports `VmSwap`, which covers swapped-out anonymous private memory and excludes shmem swap usage.
- Corrected the PSI `full` definition to "all non-idle tasks" rather than "all tasks".
- Fixed a spelling error in "legitimately".

## Review Notes
The alert threshold examples are operational heuristics rather than universal limits. The 80% swap usage alert and 100-200 KiB/sec `vmstat` threshold can be useful starting points, but production thresholds should be tuned to workload baseline, storage latency, and acceptable stall time.
