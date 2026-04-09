# Validation Summary: How to Monitor ceph_cluster_total_bytes Metric

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Prometheus (monitoring and alerting)
- PromQL (Prometheus Query Language)
- Grafana (dashboards)
- Kubernetes (kubectl CLI)

## Sources Consulted
- Ceph MGR Prometheus module metric exports: https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus `humanizePercentage` template function documentation: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus `increase()` vs `delta()` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus `deriv()` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#deriv
- Rook CephCluster CRD storage configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph `ceph df` command output format: https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found

### Issue 1: `humanizePercentage` used with pre-multiplied percentage values
- **What was wrong:** The alert rule expressions multiplied the usage ratio by 100 (e.g., `(used / total) * 100 > 75`), but the annotation templates used `{{ $value | humanizePercentage }}`. The Prometheus `humanizePercentage` function expects a ratio between 0 and 1 and multiplies by 100 internally. With `$value` already at ~75, `humanizePercentage` would display "7500%".
- **What was changed:** Removed the `* 100` multiplier from both alert expressions and changed thresholds from `75`/`85` to `0.75`/`0.85`. Now the expressions produce a 0-1 ratio that `humanizePercentage` correctly formats.
- **Why:** This was a functional bug that would produce nonsensical alert messages in production.

### Issue 2: `increase()` used on a gauge metric
- **What was wrong:** The daily growth rate query used `increase(ceph_cluster_total_used_bytes[24h])`. The `increase()` function is designed for counter metrics and applies counter-reset correction. `ceph_cluster_total_used_bytes` is a gauge (it can decrease when data is deleted), so `increase()` would misinterpret decreases as counter resets and produce incorrect values.
- **What was changed:** Replaced `increase()` with `delta()`, which is the correct function for measuring change in gauge metrics over a time range.
- **Why:** Using `increase()` on a gauge can produce inflated or incorrect growth rate values, leading to wrong capacity planning decisions.

## Review Notes
- The claim that "OSD reserved space (typically ~20%)" is a rough estimate. Ceph's default `mon_osd_full_ratio` is 0.95 (5% hard reserved), though best practices recommend keeping usage well below that for rebalancing headroom. The ~20% figure is defensible as a practical planning guideline but is not a Ceph default.
- The Grafana section uses pseudo-code in a `javascript` code block rather than actual Grafana JSON configuration. This is fine as informal guidance but readers should not expect to copy-paste it directly.
- All Ceph metrics referenced (`ceph_cluster_total_bytes`, `ceph_cluster_total_used_bytes`) are valid metrics exported by the Ceph MGR Prometheus module.
- The `deriv()` usage in the time-to-full projection is correct: `deriv()` is designed for gauges and returns a per-second rate, and the `/86400` correctly converts the resulting seconds to days.
