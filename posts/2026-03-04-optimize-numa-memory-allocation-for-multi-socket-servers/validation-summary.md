# Validation Summary: How to Optimize NUMA Memory Allocation for Multi-Socket Servers on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux NUMA
- numactl
- numastat
- systemd service unit NUMA policy options
- perf
- Linux kernel automatic NUMA balancing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring NUMA policies using systemd and NUMA policy configuration options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/assembly_using-systemd-to-manage-resources-used-by-applications_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 8 documentation: Profiling memory allocation with numastat: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/monitoring_and_managing_system_status_and_performance/profiling-memory-allocation-with-numastat_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 7 documentation: Automatic NUMA Balancing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/virtualization_tuning_and_optimization_guide/sect-virtualization_tuning_optimization_guide-numa-auto_numa_balancing
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- numactl(8) manual: https://man7.org/linux/man-pages/man8/numactl.8.html
- perf wiki tutorial: https://perfwiki.github.io/main/tutorial/
- Linux perf users mailing list explanation of node-loads and node-load-misses: https://www.spinics.net/lists/linux-perf-users/msg03351.html
- Local man/help output for numactl, numastat, systemd.exec, and perf.

## Issues Found
- The monitoring step used `numastat -m` while instructing readers to watch `other_node`. The `-m` option shows meminfo-like memory usage, not the default NUMA hit/miss statistics containing `other_node`. Changed the command to `numastat -n`, which shows the original numastat statistics in megabytes.
- The systemd strict bind example set `NUMAPolicy=bind` and `NUMAMask=0` without constraining CPU affinity. Red Hat documents that strict NUMA policies such as `bind` should also set `CPUAffinity=` appropriately. Added `CPUAffinity=numa` to align CPU affinity with `NUMAMask`.
- The `perf stat -e node-loads,node-load-misses` example used hardware cache events that are not available on every CPU/perf configuration. Added a qualifier that the command applies on systems where those hardware cache events are supported.

## Review Notes
The remaining commands and explanations are technically sound for RHEL systems with NUMA hardware and the `numactl` package installed. Kernel automatic NUMA balancing is enabled when supported and active, but manual NUMA policies can override automatic balancing for tuned workloads.
