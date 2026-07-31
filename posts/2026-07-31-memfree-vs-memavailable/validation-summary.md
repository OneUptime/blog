# Validation Summary: MemFree vs MemAvailable: Which Linux Memory Metric Should Trigger an Alert?

## Status

validated

## Post Type

Technical guide and monitoring reference

## Technologies Covered

- Linux `/proc/meminfo`
- procps `free`
- Prometheus and PromQL
- Prometheus alerting rules
- Prometheus node exporter `meminfo`, `pressure`, and `vmstat` collectors
- Linux Pressure Stall Information (PSI)
- Linux swap and virtual-memory counters
- Linux cgroup v2 memory controller

## Sources Consulted

- [Linux `proc_meminfo(5)` manual page](https://man7.org/linux/man-pages/man5/proc_meminfo.5.html)
- [procps `free(1)` manual page](https://man7.org/linux/man-pages/man1/free.1.html)
- [Linux kernel `/proc` filesystem documentation](https://docs.kernel.org/filesystems/proc.html#meminfo)
- [Linux kernel Pressure Stall Information documentation](https://docs.kernel.org/accounting/psi.html)
- [Linux kernel cgroup v2 memory-controller documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html#memory)
- [Prometheus PromQL operators documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus PromQL functions documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus subquery documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/#subquery)
- [Prometheus alerting-rules documentation](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus node exporter `meminfo` collector source](https://github.com/prometheus/node_exporter/blob/master/collector/meminfo_linux.go)
- [Prometheus node exporter `pressure` collector source](https://github.com/prometheus/node_exporter/blob/master/collector/pressure_linux.go)
- [Prometheus node exporter `vmstat` collector source](https://github.com/prometheus/node_exporter/blob/master/collector/vmstat_linux.go)
- [Prometheus node exporter collector documentation](https://github.com/prometheus/node_exporter#collectors)

## Issues Found

- The operational interpretation of `MemAvailable` said allocations could be satisfied “without entering memory pressure.” The kernel definition is specifically an estimate of memory available for new applications without swapping; reclaim can still occur. Changed the question to “without swapping.”
- The post said PromQL arithmetic preserves all existing labels. Arithmetic preserves the ordinary series labels used here but drops the metric name. Added that distinction while retaining the guidance about `job` and `instance`.
- The 8 GiB threshold example stated that 10% was 800 MiB. Corrected it to 819.2 MiB and clarified that the calculation refers to a `MemTotal` value of 8 GiB.
- The post called `MemFree` the wrong “denominator” for the alert even though `MemTotal` is the denominator in the shown ratio. Changed this to “input metric.”

## Review Notes

All PromQL expressions and the alerting-rule YAML are syntactically consistent with current Prometheus documentation. The node exporter metric names match the current collector sources. The post correctly describes native `MemAvailable` availability from Linux 3.14, PSI semantics and availability, swap counters, and cgroup v2 memory-controller files. The 10% and 10-minute values remain appropriately presented as workload-specific starting points rather than universal thresholds. No deprecated APIs or broken documentation links were found.
