# Validation Summary: How to Create Prometheus Alert Rules for Ceph Capacity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- Prometheus (monitoring and alerting)
- Prometheus Operator / PrometheusRule CRD
- Kubernetes
- PromQL (Prometheus Query Language)

## Sources Consulted
- Ceph official documentation on OSD full ratios: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/#storage-capacity
- Prometheus `humanizePercentage` template function documentation: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus `predict_linear` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#predict_linear
- Ceph MGR Prometheus module metric names: https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found

### 1. Incorrect description of `backfillfull_ratio` behavior
- **What was wrong:** The overview stated that Ceph "rejects new writes at `backfillfull_ratio` (default 90%)". This is incorrect. The `backfillfull_ratio` prevents backfill and recovery operations to OSDs at that threshold, but client writes continue until `full_ratio` (95%). Client writes are only rejected at `full_ratio`.
- **What was changed:** Rewrote the overview to correctly describe each ratio: `full_ratio` blocks writes (read-only), `backfillfull_ratio` prevents backfill/recovery operations, and `nearfull_ratio` triggers health warnings.
- **Why:** Misunderstanding these thresholds could lead operators to believe writes fail at 90% when they actually fail at 95%, causing incorrect incident response.

### 2. Misuse of `humanizePercentage` template function
- **What was wrong:** All alert expressions used `* 100` to convert ratios to percentages (e.g., `* 100 > 75`), but the annotations used `{{ $value | humanizePercentage }}`. The Prometheus `humanizePercentage` function expects a ratio (0-1) and multiplies by 100 internally. With the `* 100` in the expression, a value of 80 (meaning 80%) would display as "8000%".
- **What was changed:** Removed `* 100` from all alert expressions and changed thresholds to decimal form (0.75, 0.85, 0.90, 0.95). This makes `humanizePercentage` display correctly (e.g., 0.80 -> "80%").
- **Why:** Without this fix, every alert notification would show wildly incorrect percentage values, confusing operators during incidents.

## Review Notes
- The `predict_linear` expression already correctly used a decimal threshold (0.90) without the `* 100` multiplication, so it was consistent with the fix applied to the other rules.
- All Ceph Prometheus metric names (`ceph_cluster_total_used_bytes`, `ceph_cluster_total_bytes`, `ceph_pool_bytes_used`, `ceph_pool_max_avail`, `ceph_osd_stat_bytes_used`, `ceph_osd_stat_bytes`) are correct for the ceph-mgr Prometheus module.
- The pool utilization formula `bytes_used / (bytes_used + max_avail)` is a reasonable approximation, though it may not account for all Ceph overhead. This is a known simplification and is acceptable for alerting purposes.
- The PrometheusRule CRD format and API version (`monitoring.coreos.com/v1`) are correct.
- The `rook-ceph-tools` deployment reference and `ceph osd dump` command are correct for Rook-managed clusters.
