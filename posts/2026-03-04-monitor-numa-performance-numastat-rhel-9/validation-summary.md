# Validation Summary: How to Monitor NUMA Performance with numastat on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux NUMA
- numactl and numastat
- Performance Co-Pilot (PCP)

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Profiling memory allocation with numastat": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/monitoring_and_managing_system_status_and_performance/monitoring_and_managing_system_status_and_performance
- Local `numastat(8)` man page and `numastat --help`
- Local `numactl(8)` man page and `numactl` usage output
- Linux `numa(7)` manual page: https://man7.org/linux/man-pages/man7/numa.7.html
- PCP `pcp-numastat(1)` manual page: https://www.man7.org/linux/man-pages/man1/pcp-numastat.1.html

## Issues Found
- The `numa_miss` description said allocations fell back to another node. Red Hat and `numastat(8)` define this as memory allocated on the displayed node even though another node was intended, with a corresponding `numa_foreign` event on another node. Updated the wording to match the per-node counter semantics.
- The post stated that high `numa_miss` and `other_node` values always indicate poor placement. Updated this to "can indicate" because interpretation depends on workload policy, placement, and whether the process is intentionally spread across NUMA nodes.
- The post said a process should ideally have most memory on its local NUMA node and that memory spread across nodes should be bound to one node. Updated both statements to apply to single-node-bound workloads, since multi-threaded or intentionally interleaved workloads may legitimately use multiple NUMA nodes.
- The high-`numa_miss` remediation was presented as a definite fix. Updated it to "consider binding" because `numactl --membind` can be appropriate but is not universally correct and can fail allocation if the bound nodes lack memory.
- The PCP example used raw `pmval` reads for individual metrics. Replaced it with `pcp numastat -n` and `pminfo -dt mem.numa.alloc`, matching the PCP `pcp-numastat(1)` documentation for NUMA allocation reporting and metric semantics.

## Review Notes
The command syntax for `dnf install numactl`, `numactl --hardware`, `numastat`, `numastat -m`, `numastat -p <PID|pattern>`, `watch`, `numactl --cpunodebind`, `numactl --membind`, and `numactl --interleave=all` was verified. The post is technically valid after the targeted corrections above.
