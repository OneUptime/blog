# Validation Summary: CPU Utilization vs Load Average: Which Signal Reveals Host Saturation?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux CPU accounting through `/proc/stat`
- Linux load average and `/proc/loadavg`
- Linux Pressure Stall Information (PSI)
- Prometheus and PromQL
- Prometheus Node Exporter
- Linux cgroups, CPU quotas, and virtualization accounting

## Sources Consulted
- [Linux kernel `/proc` filesystem documentation](https://docs.kernel.org/filesystems/proc.html)
- [Linux kernel global load-average implementation](https://github.com/torvalds/linux/blob/master/kernel/sched/loadavg.c)
- [Linux kernel Pressure Stall Information documentation](https://docs.kernel.org/accounting/psi.html)
- [Linux kernel CPU load accounting documentation](https://docs.kernel.org/admin-guide/cpu-load.html)
- [Linux kernel control group v2 documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [Linux man-pages: `proc_stat(5)`](https://man7.org/linux/man-pages/man5/proc_stat.5.html)
- [Linux man-pages: `proc_loadavg(5)`](https://man7.org/linux/man-pages/man5/proc_loadavg.5.html)
- [Prometheus getting-started documentation](https://prometheus.io/docs/prometheus/latest/getting_started/)
- [Prometheus query functions documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus operators documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus Node Exporter repository and collector documentation](https://github.com/prometheus/node_exporter)
- [Node Exporter CPU metric definition](https://github.com/prometheus/node_exporter/blob/master/collector/cpu_common.go)
- [Node Exporter load-average metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/loadavg.go)
- [Node Exporter pressure collector implementation](https://github.com/prometheus/node_exporter/blob/master/collector/pressure_linux.go)
- [Node Exporter end-to-end metric fixture](https://github.com/prometheus/node_exporter/blob/master/collector/fixtures/e2e-output.txt)

## Issues Found
No technical issues found.

## Review Notes
- All three PromQL examples were checked with the current Prometheus `promtool` parser and are syntactically valid.
- The CPU calculation intentionally measures the complement of the `idle` mode, so it includes `iowait` and `steal`; the post accurately explains this limitation.
- The post correctly treats normalized load as a diagnostic clue rather than a universal saturation threshold and correctly distinguishes system-level CPU PSI `some` from the non-useful system-level CPU `full` value.
- No deprecated APIs, obsolete metric names, broken documentation links, or version-specific inaccuracies were found.
