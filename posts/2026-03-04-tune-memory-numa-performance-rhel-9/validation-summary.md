# Validation Summary: How to Tune Memory and NUMA Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux NUMA and numactl
- Linux virtual memory sysctl parameters
- Transparent Huge Pages and HugeTLB pages
- perf, free, and numastat monitoring commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring huge pages, including HugeTLB and Transparent Huge Pages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/configuring-huge-pages_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Monitoring and managing system status and performance, NUMA and numastat tooling notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/monitoring_and_managing_system_status_and_performance
- Linux kernel documentation for /proc/sys/vm tunables: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html
- numactl(8) Linux manual page: https://linuxman7.org/linux/man-pages/man8/numactl.8.html
- Local command help/man output for sysctl(8), numactl, numastat, free, and perf event names.

## Issues Found
- The descriptions of `vm.dirty_ratio` and `vm.dirty_background_ratio` said they are percentages of system memory. Linux kernel documentation defines these ratios as percentages of available memory, which includes free pages and reclaimable pages and is not the same as total system memory. Updated both descriptions to say "available memory."

## Review Notes
- The `numactl` options shown (`--hardware`, `--cpunodebind`, `--membind`, `--preferred`, and `--interleave=all`) are current and match the documented CLI.
- THP runtime settings through `/sys/kernel/mm/transparent_hugepage/enabled` and persistent kernel command-line configuration through `grubby` are supported in RHEL 9 documentation.
- Explicit huge page allocation through `vm.nr_hugepages` is valid, but production systems may prefer boot-time reservation or per-NUMA-node reservation for higher allocation reliability and better NUMA placement.
- The 20-40% performance improvement claim is workload-dependent; it is plausible as general guidance, but should be treated as an example range rather than a guarantee.
