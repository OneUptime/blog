# Validation Summary: How to Detect a Memory Leak Without Alerting on Healthy Page Cache

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux memory management
- Linux page cache, anonymous memory, shared memory, and slab accounting
- Linux procfs process and host memory interfaces
- Linux Pressure Stall Information (PSI)
- Linux cgroup v2 memory controller
- Prometheus and PromQL
- Prometheus node_exporter
- Prometheus alerting rules

## Sources Consulted
- [Linux kernel memory-management concepts](https://docs.kernel.org/admin-guide/mm/concepts.html)
- [Linux kernel `/proc` filesystem documentation](https://docs.kernel.org/filesystems/proc.html)
- [Linux `proc_meminfo(5)`](https://man7.org/linux/man-pages/man5/proc_meminfo.5.html)
- [Linux `proc_pid_status(5)`](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html)
- [Linux `proc_pid_smaps(5)`](https://man7.org/linux/man-pages/man5/proc_pid_smaps.5.html)
- [Linux kernel cgroup v2 memory-controller documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html#memory)
- [Linux kernel Pressure Stall Information documentation](https://docs.kernel.org/accounting/psi.html)
- [Linux kernel `drop_caches` documentation](https://docs.kernel.org/admin-guide/sysctl/vm.html#drop-caches)
- [Linux kernel Transparent Hugepage documentation](https://docs.kernel.org/admin-guide/mm/transhuge.html)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus alerting-rule documentation](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [node_exporter meminfo collector source](https://github.com/prometheus/node_exporter/blob/master/collector/meminfo_linux.go)
- [node_exporter pressure collector source](https://github.com/prometheus/node_exporter/blob/master/collector/pressure_linux.go)
- [node_exporter vmstat collector source](https://github.com/prometheus/node_exporter/blob/master/collector/vmstat_linux.go)

## Issues Found
- `Cached` was described as file page cache without noting that Linux includes tmpfs and shared-memory pages in this field. Updated the definition to include those pages and to state that `Cached` overlaps with `Shmem`, preventing readers from treating the metrics as disjoint.
- The alert explanation did not state precisely that the six-hour derivative is a rolling trend and that Prometheus's `for: 30m` applies to both conditions. Updated the explanation to match the rule's actual behavior.
- The alert's growth calculation said that 1 MiB/s for six hours was roughly 21.6 GiB. Corrected it to roughly 21.1 GiB (`21,600 MiB / 1,024`).
- `memory.stat` was described as splitting the cgroup footprint, which could imply mutually exclusive fields and omit the distinction between current amounts and event counters. Updated the description to reflect the interface accurately, noted overlapping keys, and clarified that cgroup `file` includes tmpfs and shared memory rather than only ordinary clean file cache.

## Review Notes
- The overall diagnostic method is technically sound: distinguish composition, retention, pressure, and ownership rather than alerting on low `MemFree` or high cache alone.
- The PromQL expressions, node_exporter metric names, and Prometheus alert-rule structure are current and syntactically consistent with the official documentation.
- `/proc/<pid>/status` exposes the listed RSS fields, but the Linux documentation labels those values as approximate; `/proc/<pid>/smaps` or `smaps_rollup` is the more precise interface when the additional collection cost is acceptable.
- `memory.events` is hierarchical; `memory.events.local` can be used when only events originating in the selected cgroup are wanted.
