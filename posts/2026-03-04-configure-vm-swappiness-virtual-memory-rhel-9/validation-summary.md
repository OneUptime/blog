# Validation Summary: How to Configure vm.swappiness and Other Virtual Memory Parameters on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux virtual memory sysctl parameters
- sysctl
- vmstat
- Swap and dirty page writeback tuning

## Sources Consulted
- Linux kernel documentation for `/proc/sys/vm/`: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Red Hat Enterprise Linux 9 documentation, "Configuring an operating system to optimize memory access": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-an-operating-system-to-optimize-memory-access_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation, "Getting started with swap": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices
- Local `sysctl --help` output for `sysctl -w` and `sysctl -p` options.
- Local `vmstat --help` output for `vmstat [delay [count]]` syntax.
- procps-ng `vmstat(8)` manual page: https://man7.org/linux/man-pages/man8/vmstat.8%40%40procps-ng.html

## Issues Found
- Clarified `vm.swappiness=100`. The post described it as aggressive swapping, but current kernel documentation describes 100 as treating swap I/O and filesystem paging as roughly equal cost.
- Clarified `vm.dirty_ratio` and `vm.dirty_background_ratio` to refer to available memory and writeback behavior consistent with Linux and RHEL documentation.
- Clarified `vm.dirty_expire_centisecs`. Dirty pages become eligible for writeback after the interval; they are not necessarily written immediately at that exact time.
- Clarified `vm.overcommit_memory=1`. It allows overcommit rather than guaranteeing that `malloc` can never fail.
- Changed the persistent settings introduction from "all" to "selected" because the snippet intentionally does not include every parameter discussed, such as `vm.overcommit_memory` and `vm.overcommit_ratio`.
- Corrected `vmstat` column descriptions. `si` and `so` are per-second swapped memory amounts, and `bi` and `bo` are block device transfer rates, not generic read/write counts.

## Review Notes
The commands and sysctl file snippets are syntactically valid. The workload-specific tuning values are reasonable starting points, but production values should be validated with workload testing and monitoring because optimal VM tuning is workload- and storage-dependent.
