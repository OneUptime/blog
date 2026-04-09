# Validation Summary: How to Enable RBD Statistics in Rook Block Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RBD, MGR modules, Prometheus module, rbd_support module)
- Kubernetes (CRDs, kubectl, port-forwarding)
- Prometheus (metrics scraping, PromQL, PrometheusRule CRD)
- Grafana (dashboards via ConfigMap sidecar)

## Sources Consulted
- Ceph MGR Prometheus module source code (`module.py`) — metric name construction logic (`promethize()` function prepends `ceph_` prefix, RBD metrics use `rbd_` + key pattern)
- Ceph Prometheus module configuration options (`rbd_stats_pools`, `rbd_stats_pools_refresh_interval`)
- Rook CephBlockPool CRD documentation — `enableRBDStats` field in the spec
- Ceph CLI reference — `ceph config get/set` vs `ceph osd pool get/set` semantics

## Issues Found

### 1. All RBD metric names were incorrect (Steps 4, 5, 6, 8, and mermaid diagram)
**What was wrong:** The post used fabricated metric names with a `rbd_client_io_*` prefix (e.g., `rbd_client_io_ops_total`, `rbd_client_io_bytes_total`, `rbd_client_io_latency_sum`). These metrics do not exist in Ceph.
**What was changed:** Replaced all metric references with the actual Ceph Prometheus module metric names: `ceph_rbd_write_ops`, `ceph_rbd_read_ops`, `ceph_rbd_write_bytes`, `ceph_rbd_read_bytes`, `ceph_rbd_write_latency_sum`, `ceph_rbd_write_latency_count`, `ceph_rbd_read_latency_sum`, `ceph_rbd_read_latency_count`.
**Why:** Ceph's Prometheus module constructs metric names by prepending `ceph_` to the internal key names. RBD metrics are split by read/write direction, not aggregated into a single counter.

### 2. Non-existent `rbd_client_io_errors_total` metric and alert (Steps 4 and 6)
**What was wrong:** The post referenced `rbd_client_io_errors_total` and built a `RBDHighErrorRate` alert on it. This metric does not exist in Ceph's Prometheus module.
**What was changed:** Removed the error metric from the metrics list. Replaced the `RBDHighErrorRate` alert with a `RBDHighReadLatency` alert using actual metrics.
**Why:** There is no per-image I/O error counter exposed by the Ceph Prometheus module.

### 3. `rbd_stats_pools` treated as a pool property (Steps 2 and Troubleshooting)
**What was wrong:** The post used `ceph osd pool get replicapool rbd_stats_pools` and `ceph osd pool set replicapool rbd_stats_pools "replicapool"`. The `rbd_stats_pools` setting is a MGR Prometheus module configuration option, not a pool-level property, so these commands would fail.
**What was changed:** Replaced with `ceph config get mgr mgr/prometheus/rbd_stats_pools` and `ceph config set mgr mgr/prometheus/rbd_stats_pools "replicapool"`.
**Why:** `rbd_stats_pools` is defined as an `Option` in the Prometheus MGR module and must be accessed via `ceph config get/set mgr`.

### 4. Wrong config option name and default value (Step 3)
**What was wrong:** The post used `ceph config set mgr mgr/rbd_support/stats_polling_interval 5` and claimed the default was 5 seconds. The option `stats_polling_interval` does not exist.
**What was changed:** Replaced with `ceph config set mgr mgr/prometheus/rbd_stats_pools_refresh_interval 300`. Updated the comment to state the correct default of 300 seconds.
**Why:** The actual option is `rbd_stats_pools_refresh_interval` in the Prometheus module (not rbd_support), and it controls how often the module rescans pools for new/removed RBD images. The default is 300 seconds (5 minutes).

### 5. Incorrect grep pattern in Step 4
**What was wrong:** `grep "^rbd_"` would match nothing since all Ceph metrics are prefixed with `ceph_`.
**What was changed:** Updated to `grep "^ceph_rbd_"`.
**Why:** The Prometheus module's `promethize()` function prepends `ceph_` to all metric names.

### 6. Grafana dashboard PromQL used wrong metrics (Step 5)
**What was wrong:** All three panel expressions used non-existent metric names and treated read/write as a single aggregated metric.
**What was changed:** Updated all expressions to use correct `ceph_rbd_*` metrics. Split panels into separate read/write targets since Ceph exposes them as separate counters.
**Why:** Ceph does not expose combined read+write counters; each direction has its own metric.

## Review Notes
- The `enableRBDStats: true` field in the CephBlockPool CRD is correct and is the proper Rook-native way to enable this feature.
- The Grafana dashboard JSON is simplified for illustration purposes — a production dashboard would need additional fields (uid, version, datasource, panel IDs, etc.) to be importable.
- The `rbd perf image iotop` command in Troubleshooting is interactive and requires a TTY — it may not work well in all scripted contexts but is correct for manual troubleshooting.
- The `ceph log last 50` command in Step 8 is valid but may not surface RBD stats-related messages unless debug logging is enabled for the MGR.
