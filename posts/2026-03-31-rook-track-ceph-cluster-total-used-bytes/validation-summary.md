# Validation Summary: How to Track ceph_cluster_total_used_bytes Metric

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (storage orchestration on Kubernetes)
- Prometheus (metrics and alerting)
- PromQL (query language)
- Grafana (dashboarding)
- Kubernetes CLI (kubectl)
- Ceph CLI (ceph df, rados df)

## Sources Consulted
- Ceph Prometheus module metric documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus querying documentation (rate, predict_linear): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Ceph `ceph df` command reference: https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found

1. **Alert threshold mismatch for CephRapidStorageGrowth**: The `rate()` function returns a per-second rate, but the threshold `1073741824` (1 GiB) was compared directly, meaning the alert would fire at 1 GiB/second, not 1 GiB/hour as the annotation stated. Fixed by multiplying `rate()` by 3600 to convert to bytes/hour before comparing against the 1 GiB threshold. Also updated the description annotation template to show `B/h` instead of `B/s` to match the converted unit.

2. **Invalid PromQL operator `vs`**: The expression `sum(ceph_pool_raw_bytes_used) vs ceph_cluster_total_used_bytes` used `vs` which is not a valid PromQL operator. Fixed by splitting into two separate queries with comments, and clarifying the comparison is meant to be done visually (e.g., side by side in Grafana).

## Review Notes
- The Grafana panel configuration section uses a `javascript` code fence for what is pseudo-configuration rather than actual code. This is a stylistic choice and not technically incorrect, but readers should understand it describes Grafana UI settings rather than executable code.
- The `ceph df --format json` JSON path `.stats.total_used_bytes` is correct for current Ceph versions (Pacific, Quincy, Reef). In older versions the field structure may differ.
- The metric names (`ceph_cluster_total_used_bytes`, `ceph_cluster_total_bytes`, `ceph_pool_bytes_used`, `ceph_pool_raw_bytes_used`) are all valid metrics exported by the Ceph Prometheus module.
