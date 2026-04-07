# Validation Summary: How to Track Ceph Storage Growth Trends in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Grafana (dashboarding and alerting)
- Prometheus (metrics and PromQL)

## Sources Consulted
- Ceph MGR Prometheus module metrics documentation: https://docs.ceph.com/en/latest/mgp/prometheus/
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Prometheus PromQL functions documentation (deriv, predict_linear): https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found

1. **Incorrect metric name for available capacity (line 25)**: The post used `ceph_cluster_total_used_raw_bytes` and labeled it as "Available raw capacity." This metric represents raw used bytes, not available bytes. Changed to `ceph_cluster_available_bytes`, which is the correct metric for available raw capacity exported by the Ceph MGR Prometheus module.

2. **Incorrect pool-level metric name (lines 28, 72)**: The post used `ceph_pool_bytes_used`, which is not a metric exported by the Ceph MGR Prometheus module. Changed all occurrences to `ceph_pool_stored`, which is the correct metric name for bytes stored per pool.

3. **Misleading comment in forecast query (line 57)**: The PromQL comment said "Days until cluster is 85% full" but the query actually calculates the projected usage percentage in 30 days. Changed the comment to "Projected usage percentage in 30 days (using 7-day trend)" to accurately describe what the query computes.

## Review Notes
- The `deriv()` and `predict_linear()` PromQL functions are used correctly. `deriv()` returns per-second rate and the `* 86400` conversion to daily rate is correct.
- The alert threshold query correctly uses `predict_linear()` with a 14-day range window and 14-day projection, compared against 0.80 ratio.
- The summary correctly attributes `predict_linear()` and `deriv()` as Prometheus functions (usable in Grafana), not Grafana-native functions.
- The dashboard layout suggestion is reasonable and follows common Grafana dashboard organization patterns.
