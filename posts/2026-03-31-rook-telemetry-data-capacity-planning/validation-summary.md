# Validation Summary: How to Use Telemetry Data for Capacity Planning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Kubernetes Ceph operator)
- Ceph CLI (`ceph df`, `ceph osd df`, `ceph mgr module`)
- Python 3 (for JSON parsing scripts)
- Prometheus (PromQL queries: `predict_linear`, `deriv`)

## Sources Consulted
- Ceph official documentation: telemetry module (https://docs.ceph.com/en/latest/mgr/telemetry/)
- Ceph official documentation: `ceph df` command and JSON output format (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph official documentation: `ceph osd df` command (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Prometheus documentation: `predict_linear` and `deriv` functions (https://prometheus.io/docs/prometheus/latest/querying/functions/)
- Ceph Prometheus exporter metric names (https://docs.ceph.com/en/latest/mgr/prometheus/)

## Issues Found
1. **Prometheus query mislabeled (line 136)**: The query `predict_linear(ceph_cluster_total_used_bytes[7d], 30 * 24 * 3600) / ceph_cluster_total_bytes` was labeled "Days until full (linear projection)" but it actually calculates the predicted utilization ratio 30 days from now. `predict_linear` extrapolates the metric value at a future time offset — dividing by total bytes gives a ratio, not a day count. Fixed by correcting the comment to "Predicted utilization ratio in 30 days (linear projection)" and adding a separate correct query for days until full using `deriv()`: `(ceph_cluster_total_bytes - ceph_cluster_total_used_bytes) / deriv(ceph_cluster_total_used_bytes[7d]) / 86400`.

## Review Notes
- The `ceph df --format json` output structure (`stats.total_bytes`, `stats.total_used_raw_bytes`, `stats.total_avail_bytes`) is accurate for Ceph Reef and later releases. Older Ceph versions may use slightly different key names.
- The `ceph osd df --format json` field `kb_used` is in KiB (kibibytes), so the `/1024/1024` conversion to GiB is correct.
- The post correctly notes that the telemetry module can be enabled for local data access without opting in to external sharing.
- The forecasting math is correct: (180 * 0.80) - 90 = 54 TiB remaining, 54 / 8 = 6.75 months.
