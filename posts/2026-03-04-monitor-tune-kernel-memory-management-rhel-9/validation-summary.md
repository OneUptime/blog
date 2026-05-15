# Validation Summary: How to Monitor and Tune Kernel Memory Management on RHEL

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel virtual memory management
- procfs (`/proc/meminfo`, `/proc/vmstat`, `/proc/sys/vm`, `/proc/pressure/memory`)
- `sysctl` and `sysctl.d`
- `vmstat`, `free`, `watch`, `pgrep`
- systemd service configuration (`OOMScoreAdjust`)

## Sources Consulted
- Linux kernel documentation: `/proc/sys/vm` sysctls, including `swappiness`, dirty page tunables, `drop_caches`, overcommit, `panic_on_oom`, and `vfs_cache_pressure`: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel documentation: Pressure Stall Information (PSI): https://docs.kernel.org/accounting/psi.html
- Red Hat Enterprise Linux 9 documentation: monitoring and diagnosing memory issues with RHEL tools: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-an-operating-system-to-optimize-memory-access_monitoring-and-managing-system-status-and-performance
- Local Linux man pages: `proc_meminfo(5)`, `proc_sys_vm(5)`, `proc_pid_oom_score_adj(5)`, `sysctl.d(5)`, `systemd.exec(5)`
- Local command help output: `vmstat --help`, `free --help`, `sysctl --help`, `pgrep --help`

## Issues Found
- Replaced the obsolete `pdflush/writeback threads` wording with `flusher/writeback threads`. RHEL 9 kernels use kernel flusher/writeback threads; `pdflush` is historical terminology.
- Corrected dirty page threshold descriptions from "percentage of total memory" to "percentage of available memory" and clarified that `dirty_ratio` makes writing processes start writeback themselves. This matches the kernel documentation for `dirty_background_ratio` and `dirty_ratio`.
- Clarified `dirty_expire_centisecs` as the age at which dirty data becomes eligible for writeback, rather than a strict maximum time before forced writeback.
- Fixed the OOM examples to use `pgrep -n -x postgres` assigned to a single `pid` variable. `pidof postgres` can return multiple PIDs, which can produce invalid `/proc/...` paths in command substitution.
- Changed the PSI `full` definition to "all non-idle tasks" to match the kernel PSI documentation.
- Softened the statement about non-zero PSI `full` pressure so it recommends investigation under normal load instead of asserting that any non-zero value always means the system needs memory or tuning.
- Softened the `vm.swappiness = 0` diagram text so it no longer implies that everything is always kept in RAM. Swappiness `0` strongly avoids swap, but does not make swapping impossible under memory pressure.

## Review Notes
The remaining commands and configuration examples are syntactically valid for a RHEL-style Linux system. The tuning values are workload-dependent examples, not universal recommendations; future revisions could add stronger warnings to test them under representative load before applying in production.
