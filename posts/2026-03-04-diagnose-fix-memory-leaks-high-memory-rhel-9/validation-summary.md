# Validation Summary: How to Diagnose and Fix Memory Leaks and High Memory Usage on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux memory management and `/proc`
- procps-ng tools: `free`, `ps`, `pmap`, `slabtop`
- sysstat `pidstat`
- BCC/eBPF `memleak`
- Valgrind Memcheck
- Linux cgroup v2 memory controller
- Linux OOM killer tuning

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using cgroupfs to manually manage cgroups": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/assembly_using-cgroupfs-to-manually-manage-cgroups_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation, "Analyzing system performance with BPF Compiler Collection": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/analyzing-system-performance-with-bpf-compiler_collection_monitoring-and-managing-system-status-and-performance
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux man-pages: `proc_meminfo(5)`, `proc_sys_vm(5)`, `proc_pid_oom_score_adj(5)`
- procps-ng man pages: `free(1)`, `ps(1)`, `pmap(1)`, `slabtop(1)`
- sysstat man page: `pidstat(1)`
- BCC `memleak` documentation/man page: https://www.mankier.com/8/bcc-memleak
- Valgrind Memcheck manual: https://valgrind.org/docs/manual/mc-manual.html

## Issues Found
- The `pidstat` section implied continuous RSS growth alone is likely a leak. Changed the wording to note that growth after workload activity stops may indicate a leak, because RSS growth can also be normal caching, allocator behavior, or workload-driven memory use.
- The `pmap` explanation described the `Dirty` column as "potentially leaked". Changed it to describe dirty pages as modified pages and noted that growing private dirty memory can help identify writable memory growth.
- The BCC `memleak` command used `30` as a positional interval but described it as "allocations not freed after 30 seconds". Added `-o 30000` and used a 5-second report interval so the command matches the explanation.
- The cache-dropping section recommended dropping caches when the system is under memory pressure. Changed the wording to frame it as memory testing or temporary emergency use, and added `sync` before writing to `/proc/sys/vm/drop_caches`, as kernel documentation recommends because dirty objects are not freeable.
- The cgroup v2 example wrote `2G` and `1G` directly to `memory.max` and `memory.high`. Changed these to byte values because cgroup v2 memory interface files use byte counts or `max`. Also added a `PID=$(pgrep my-app | head -1)` assignment before writing `$PID` to `cgroup.procs`.

## Review Notes
The post is technically relevant and the reviewed commands are current for a RHEL 9 style system. Manual cgroupfs configuration is valid, but Red Hat generally recommends using systemd resource controls for managed services when practical.
