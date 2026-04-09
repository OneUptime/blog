# Validation Summary: How to Monitor Ceph Disk IO Wait Times

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD latency metrics, disk management)
- Rook (Ceph operator for Kubernetes)
- Prometheus (node exporter metrics, PromQL queries)
- Prometheus Operator (PrometheusRule CRD for alerting)
- Grafana (metric correlation and visualization)
- iostat (sysstat package for real-time disk statistics)
- smartctl (smartmontools for SMART disk health)
- Linux IO schedulers (none, mq-deadline, bfq)

## Sources Consulted
- Prometheus node exporter documentation and metric definitions (https://github.com/prometheus/node_exporter)
- Linux kernel /proc/diskstats documentation (field 11: weighted time spent doing I/Os)
- sysstat/iostat man page for `-x` flag and output columns
- Ceph MGR Prometheus module metrics (ceph_osd_apply_latency_ms)
- Prometheus Operator API reference for PrometheusRule CRD (monitoring.coreos.com/v1)
- smartmontools documentation for smartctl and SMART attributes
- Linux kernel block layer documentation for IO scheduler sysfs interface (/sys/block/*/queue/scheduler)

## Issues Found
No technical issues found.

## Review Notes
- The example `iostat` output includes the `svctm` column, which has been deprecated in modern versions of sysstat (marked for removal since ~sysstat 11.7). The post does not instruct readers to rely on `svctm` — it correctly focuses on `await` and `%util` — so this is a cosmetic issue in the illustrative output, not a functional error.
- The introductory paragraph defines IO wait as "how long CPU cores sit idle waiting for disk operations" (CPU iowait from /proc/stat), while the metrics used (`node_disk_io_time_weighted_seconds_total`) measure disk-level weighted IO time. These are related but conceptually distinct. However, the practical guidance and metric usage are correct, and the approach of using `node_disk_io_time_weighted_seconds_total` as a proxy for disk IO pressure is standard practice.
- The `* 1000` conversion in the Grafana correlation section is used for visual scale alignment with `ceph_osd_apply_latency_ms`, not for unit equivalence. This is a valid Grafana technique for overlaying metrics with different scales.
