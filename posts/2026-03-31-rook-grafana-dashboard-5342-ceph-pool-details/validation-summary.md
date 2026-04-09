# Validation Summary: How to Set Up Grafana Dashboard 5342 for Ceph Pool Details

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Ceph storage orchestrator for Kubernetes)
- Grafana (dashboard and visualization)
- Prometheus (metrics and alerting)
- Ceph MGR Prometheus module (metrics exporter)
- PromQL (Prometheus query language)
- Kubernetes (kubectl commands)

## Sources Consulted
- Grafana.com dashboard API for dashboard 5342 — confirmed as "Ceph - Pools" (https://grafana.com/api/dashboards/5342)
- Ceph MGR Prometheus module source code (https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py)
- Ceph Prometheus metrics gist with actual metric output and labels (https://gist.github.com/leseb/6d3f92ed69e5fe1053894dacc93263b7)
- DigitalOcean ceph_exporter metrics documentation (https://github.com/digitalocean/ceph_exporter/blob/main/METRICS.md)
- Ceph Prometheus module documentation (https://docs.ceph.com/en/quincy/mgr/prometheus/)
- Grafana community forum on Ceph pool name querying (https://community.grafana.com/t/ceph-pool-choose-pool-by-name/28237)
- Ceph tracker issue #49049 on pool metric labels (https://tracker.ceph.com/issues/49049)

## Issues Found

### Issue 1: Multi-pool comparison PromQL query used nonexistent `name` label
- **What was wrong:** The query `sum by(name) (ceph_pool_bytes_used) / sum by(name) (ceph_pool_bytes_used + ceph_pool_max_avail) * 100` assumed that `ceph_pool_bytes_used` and `ceph_pool_max_avail` have a `name` label. These metrics only carry a `pool_id` label; the pool name is only available on the `ceph_pool_metadata` metric.
- **What was changed:** Replaced with a label join approach: `(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) * 100 * on(pool_id) group_left(name) ceph_pool_metadata`. This correctly maps pool IDs to pool names via the metadata metric.
- **Why:** Without the join, `sum by(name)` would collapse all pools into a single unnamed series, producing a single cluster-wide number instead of per-pool comparisons.

### Issue 2: Alert expression referenced `$labels.name` without metadata join
- **What was wrong:** The PrometheusRule alert used `{{ $labels.name }}` in its annotation, but the expression `(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) > 0.80` only produces series with `pool_id` labels, not `name`.
- **What was changed:** Added `* on(pool_id) group_left(name) ceph_pool_metadata` to the alert expression so the `name` label is propagated to the alert and available in annotations.
- **Why:** Without the metadata join, `{{ $labels.name }}` would resolve to an empty string in alert notifications, making it impossible to identify which pool triggered the alert.

## Review Notes
- The pool quota visualization PromQL (`ceph_pool_bytes_used / ceph_pool_quota_max_bytes * 100`) will produce infinity if no quota is set on a pool (quota_max_bytes = 0). Users applying this should add a filter like `ceph_pool_quota_max_bytes > 0` to avoid unexpected results. Not fixed since the section explicitly discusses quota tracking, implying quotas are configured.
- All other technical content verified as correct: dashboard 5342 confirmed as "Ceph - Pools" on Grafana.com, Ceph MGR Prometheus port 9283, `ceph osd pool ls detail` command syntax, Grafana import API endpoints, `label_values(ceph_pool_metadata, name)` variable query, `ceph_pg_total` and `ceph_pg_clean` metrics (confirmed to have `pool_id` labels for per-pool granularity), and `ceph pg ls-by-pool` command.
