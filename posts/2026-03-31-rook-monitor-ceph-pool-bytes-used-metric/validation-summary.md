# Validation Summary: How to Monitor ceph_pool_bytes_used Metric

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Prometheus (monitoring and alerting)
- PromQL (Prometheus query language)
- Grafana (dashboards)
- Kubernetes (container orchestration)

## Sources Consulted
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Prometheus querying functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus data model naming conventions: https://prometheus.io/docs/practices/naming/
- Rook Ceph toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found

1. **Incorrect metric name `ceph_pool_objects_total`**: Changed to `ceph_pool_objects`. The `_total` suffix is a Prometheus naming convention reserved for counter-type metrics. The number of objects in a pool is a gauge (can decrease when objects are deleted), and the Ceph MGR Prometheus module exports it as `ceph_pool_objects`.

2. **Incorrect metric name `ceph_pool_raw_bytes_used`**: Changed to `ceph_pool_stored_raw`. The Ceph MGR Prometheus module exposes raw stored bytes under the metric name `ceph_pool_stored_raw`, not `ceph_pool_raw_bytes_used`.

3. **Incorrect comment on raw bytes metric**: The comment said "Raw bytes stored (before replication factor)" but raw bytes are actually the storage used *after* applying the replication factor (raw = stored x replication_size). Changed to "Raw bytes stored (including replication overhead)".

4. **`humanizePercentage` misuse in alert annotation**: The alert expression produces a numeric percentage (e.g., 76.5), but the Prometheus `humanizePercentage` template function treats its input as a ratio (0-1). Passing 76.5 would render as "7650%". Changed to `{{ $value | printf "%.1f" }}%` which correctly formats the value.

5. **`rate()` used on gauge metric**: `ceph_pool_bytes_used` is a gauge metric (values can go up and down). The `rate()` function is designed for counters and misinterprets gauge decreases as counter resets, producing incorrect results. Changed to `deriv()`, which computes the per-second derivative via linear regression and correctly handles both increases and decreases in gauge values.

## Review Notes
- The pool usage percentage formula `(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) * 100` is a standard and correct approach for estimating pool fullness.
- The `ceph osd pool set-quota` and `get-quota` commands are correct.
- The Grafana panel descriptions use JavaScript code blocks for what is essentially pseudo-configuration. This is unconventional but not technically incorrect.
- For more robust capacity prediction, `predict_linear()` could be used as an alternative to the manual `deriv()` division approach, but the current method is valid.
