# Validation Summary: How to Create Custom Grafana Dashboards for Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (storage orchestration on Kubernetes)
- Grafana (dashboard and visualization)
- Prometheus (metrics and PromQL)
- Kubernetes (ConfigMap-based dashboard provisioning)
- Ceph MGR Prometheus module (metric source)

## Sources Consulted
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Prometheus metrics reference (metric names, labels, and types exported by the mgr/prometheus module)
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana HTTP API (dashboard export endpoint): https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Grafana community dashboards: https://grafana.com/grafana/dashboards/ (IDs 2842, 5336, 5342)
- PromQL function reference for `label_values()`, `rate()`, `changes()`, `sum()`, `avg()`

## Issues Found

### 1. Pool capacity metrics used incorrect label for filtering by pool name
**What was wrong:** The per-pool usage query used `ceph_pool_bytes_used{name=~"$pool"}` and `ceph_pool_max_avail{name=~"$pool"}`, filtering directly on a `name` label. However, these pool stat metrics are labeled by `pool_id`, not `name`. The human-readable pool name is only available on the `ceph_pool_metadata` info metric.

**What was changed:** Replaced the direct `{name=~"$pool"}` filter with a PromQL label join using `* on(pool_id) group_left(name) ceph_pool_metadata{name=~"$pool"}` to correctly filter pools by name via the metadata metric.

**Why:** Without this fix, the query would return no results because the `name` label does not exist on `ceph_pool_bytes_used` or `ceph_pool_max_avail`.

### 2. Non-existent latency histogram metrics
**What was wrong:** The average write latency query used `ceph_osd_op_w_latency_sum` and `ceph_osd_op_w_latency_count` as if they were Prometheus histogram-style metrics. These metric names do not exist in the standard Ceph MGR Prometheus module.

**What was changed:** Replaced the histogram-style calculation (`sum(rate(..._sum)) / sum(rate(..._count)) * 1000`) with `avg(ceph_osd_apply_latency_ms)`, which is the correct per-OSD gauge metric for write apply latency, already reported in milliseconds.

**Why:** The original metrics would cause a "no data" result. `ceph_osd_apply_latency_ms` is the standard OSD write latency metric exposed by the Ceph Prometheus module.

### 3. Minor: Updated latency panel settings note
**What was changed:** Clarified that the metric is already in milliseconds, so no unit conversion is needed in the query.

## Review Notes
- The community dashboard IDs referenced (2842, 5336, 5342) are valid Grafana community dashboard IDs for Ceph.
- The `ceph_health_status` value mapping (0=OK, 1=WARN, 2=ERROR) is correct per the Ceph MGR Prometheus module.
- The annotation query `changes(ceph_health_status[1m]) > 0` is valid PromQL, though a wider window (e.g., 5m) may be more robust depending on scrape interval.
- The Grafana API export approach and `jq` pipeline for stripping `id`/`version` fields is correct.
- The ConfigMap provisioning pattern with `grafana_dashboard: "1"` label is the standard approach for the Grafana sidecar in kube-prometheus-stack deployments.
- `ceph_osd_apply_latency_ms` represents the apply (write commit) latency. Ceph does not expose a separate read-specific latency metric via the standard Prometheus module. For read latency, `ceph_osd_commit_latency_ms` is another available gauge but covers commit latency rather than being read-specific.
