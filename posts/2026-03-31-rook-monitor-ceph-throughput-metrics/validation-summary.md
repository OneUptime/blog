# Validation Summary: How to Monitor Ceph Throughput Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Prometheus (metrics and alerting)
- Grafana (dashboards)
- PromQL (Prometheus query language)
- Kubernetes (kubectl CLI)
- rados bench (Ceph benchmarking tool)

## Sources Consulted
- Ceph MGR Prometheus module metric definitions: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook CephCluster monitoring configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Ceph CLI reference (`ceph -s` output format): https://docs.ceph.com/en/latest/rados/operations/monitoring/
- rados bench documentation: https://docs.ceph.com/en/latest/man/8/rados/

## Issues Found

### 1. Non-existent cluster-level Prometheus metrics
- **What was wrong:** The post listed `ceph_cluster_total_bytes_read` and `ceph_cluster_total_bytes_written` as key metrics. These do not exist in the Ceph MGR Prometheus module. The `ceph_cluster_total_*` namespace only includes capacity metrics like `ceph_cluster_total_bytes` and `ceph_cluster_total_used_bytes`, not I/O throughput counters.
- **What was changed:** Replaced with the correct per-OSD metrics (`ceph_osd_op_r_out_bytes`, `ceph_osd_op_w_in_bytes`) and per-pool metrics (`ceph_pool_rd_bytes`, `ceph_pool_wr_bytes`). Added note about using `sum()` for cluster-wide aggregation.
- **Why:** Using non-existent metric names would cause PromQL queries to return empty results, making the tutorial non-functional.

### 2. Incorrect PromQL queries for cluster throughput
- **What was wrong:** Queries used `rate(ceph_cluster_total_bytes_written[5m])` and `rate(ceph_cluster_total_bytes_read[5m])` directly.
- **What was changed:** Replaced with `sum(rate(ceph_osd_op_w_in_bytes[5m]))` and `sum(rate(ceph_osd_op_r_out_bytes[5m]))` to correctly aggregate per-OSD throughput into cluster-wide totals.
- **Why:** Consistent with the corrected metric names and the actual way cluster throughput is derived in Ceph.

### 3. Incorrect `ceph -s` output format
- **What was wrong:** The example output showed `io:` nested under `services:` with separate `read:` and `write:` lines. In actual Ceph output, `io:` is a top-level section, and throughput is displayed on a single line as `150 MiB/s rd, 80 MiB/s wr`.
- **What was changed:** Moved `io:` to top level, added placeholder service entries (`mon`, `mgr`, `osd`), and corrected the throughput line format.
- **Why:** Readers comparing the example to real output would be confused by the structural mismatch.

### 4. PrometheusRule alert expressions used non-existent metrics
- **What was wrong:** Alert expressions referenced `ceph_cluster_total_bytes_written` and `ceph_cluster_total_bytes_read`.
- **What was changed:** Updated to `sum(rate(ceph_osd_op_w_in_bytes[5m]))` and `sum(rate(ceph_osd_op_r_out_bytes[5m]))`.
- **Why:** Alerts using non-existent metrics would never fire.

### 5. PromQL code block language tag
- **What was wrong:** PromQL queries were in a `bash` code block.
- **What was changed:** Changed to `promql` for correct syntax highlighting.
- **Why:** Minor formatting improvement for accuracy; PromQL is not bash.

## Review Notes
- The rados bench commands, CephCluster monitoring YAML, and Grafana panel suggestions are all correct.
- The `rulesNamespace` field in the CephCluster monitoring spec is valid but optional in newer Rook versions; leaving it is fine for clarity.
- Alert thresholds (500 MB/s write, 1 MB/s read) are reasonable example values but will need tuning per environment. The post correctly frames these as examples.
