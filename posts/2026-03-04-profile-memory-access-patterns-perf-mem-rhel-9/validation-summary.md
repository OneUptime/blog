# Validation Summary: How to Profile Memory Access Patterns with perf mem on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux perf
- perf mem
- perf c2c
- perf stat and perf record
- NUMA and numactl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Getting started with perf - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/getting-started-with-perf_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Profiling memory accesses with perf mem - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/profiling-memory-accesses-with-perf-mem_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Counting events during process execution with perf stat - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/counting-events-during-process-execution-with-perf-stat_monitoring-and-managing-system-status-and-performance
- Red Hat Enterprise Linux 9 documentation: Detecting false sharing with perf c2c - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/detecting-false-sharing_monitoring-and-managing-system-status-and-performance
- perf-mem(1) Linux manual page - https://man7.org/linux/man-pages/man1/perf-mem.1.html
- Local command help for `perf mem`, `perf c2c`, `perf list`, and `numactl` on the review system.

## Issues Found
- The post said `perf mem report` output is sorted by latency. Red Hat documents that the default report is sorted by overhead, while the Local Weight column displays access latency in processor cycles. Updated the wording to say the report is sorted by overhead and includes latency.
- The "Sorting by Latency" section used `perf mem report --sort=mem,sym,dso --stdio`, but `mem` is a memory access type sort key, not a latency sort. Renamed the section to "Sorting by Memory Access Type" and updated the explanation to use the Local Weight column for latency analysis.

## Review Notes
- The `perf mem`, `perf c2c`, `perf stat`, and `numactl` command forms shown are consistent with Red Hat documentation and local command help. Availability of memory sampling, LLC events, and latency details remains hardware- and kernel-dependent.
