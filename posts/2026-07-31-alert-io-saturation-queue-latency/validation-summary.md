# Validation Summary: Disk Busy but Not Full: How to Alert on I/O Saturation, Queueing, and Latency

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Linux block-device I/O statistics (`/proc/diskstats` and sysfs `stat` files)
- Prometheus and PromQL
- Prometheus Node Exporter diskstats and pressure collectors
- Linux Pressure Stall Information (PSI)
- Prometheus alerting and recording rules
- HDD, SSD, NVMe, RAID, multipath, and device-mapper monitoring

## Sources Consulted

- [Linux kernel I/O statistics field definitions](https://docs.kernel.org/admin-guide/iostats.html)
- [Linux kernel block-layer statistics definitions](https://docs.kernel.org/block/stat.html)
- [Linux kernel Pressure Stall Information](https://docs.kernel.org/accounting/psi.html)
- [Linux kernel `/proc` documentation for CPU `iowait`](https://docs.kernel.org/filesystems/proc.html)
- [Prometheus Node Exporter Linux diskstats collector](https://github.com/prometheus/node_exporter/blob/master/collector/diskstats_linux.go)
- [Prometheus Node Exporter common disk metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/diskstats_common.go)
- [Prometheus Node Exporter pressure collector](https://github.com/prometheus/node_exporter/blob/master/collector/pressure_linux.go)
- [Prometheus `rate()` documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus operators and vector matching documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus alerting rule documentation](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording rule documentation](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [`iostat(1)` manual page](https://man7.org/linux/man-pages/man1/iostat.1.html)

## Issues Found

- The combined-latency label, illustrative alert description, and summary referred generically to completion time even though their expressions include only read and write counters. Clarified these references as read/write completion time because Linux and Node Exporter account for discard and flush operations in separate counters.

## Review Notes

- The complete alerting-rule YAML and PromQL expression passed `promtool check rules` with Prometheus `promtool` 3.13.2.
- The device filter is intentionally illustrative and excludes partitions through Prometheus's fully anchored regular-expression matching.
- PSI metrics require kernel PSI support and an available Node Exporter pressure collector.
- The latency calculations are aggregate means, not percentiles, as the post correctly explains.
