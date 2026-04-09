# Validation Summary: How to Set Up Grafana Dashboard for Ceph RGW Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook (Ceph operator for Kubernetes)
- Grafana (dashboarding)
- Prometheus / PromQL
- S3-compatible object storage
- Kubernetes CRDs (CephObjectStore)

## Sources Consulted
- Ceph RGW perf counters source code (Reef branch): https://github.com/ceph/ceph/blob/reef/src/rgw/rgw_perf_counters.cc
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- cephmetrics RGW workload Grafana dashboard: https://github.com/ceph/cephmetrics/blob/master/dashboards/mgr-prometheus/ceph-rgw-workload.json
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook Prometheus Monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook GitHub issue #6201 (healthCheck field API coherence): https://github.com/rook/rook/issues/6201

## Issues Found

1. **Invalid `healthCheck.bucket.enabled` field in CephObjectStore YAML**: The field `spec.healthCheck.bucket.enabled: true` does not exist in the CephObjectStore CRD. The correct field is `spec.healthCheck.bucket.disabled` (boolean, default `false`). Changed `enabled: true` to `disabled: false`.

2. **Incorrect ServiceMonitor claim**: The post stated "The Rook operator automatically creates a ServiceMonitor for RGW when metrics are enabled." This is misleading. RGW metrics are exposed through the Ceph MGR Prometheus module, enabled via `monitoring.enabled: true` in the CephCluster CR (not the CephObjectStore CR). ServiceMonitors must be deployed separately from example manifests in the Rook repository. Rewrote the paragraph to accurately describe how metrics are enabled and scraped.

3. **"Request Rate Panel" section mislabeled**: The section title said "Request Rate Panel" and the description said "showing GET vs. PUT rates," but the PromQL queries used `ceph_rgw_get_b` and `ceph_rgw_put_b` (byte throughput metrics, not request count metrics). Changed the heading to "Throughput Panel" and description to "showing GET vs. PUT byte throughput."

4. **`ceph_rgw_qlen` mislabeled as "Active RGW connections"**: The metric `ceph_rgw_qlen` is defined in the Ceph source code as "Queue length" (request queue length), not active connections. The active requests metric is `ceph_rgw_qactive`. Changed the comment to "RGW request queue length" and renamed the section heading from "Active Connections Panel" to "Request Queue Length Panel."

## Review Notes
- The Ceph RGW metric names used in this post (`ceph_rgw_req`, `ceph_rgw_get`, `ceph_rgw_put`, `ceph_rgw_failed_req`, `ceph_rgw_get_b`, `ceph_rgw_put_b`, `ceph_rgw_get_initial_lat_sum/count`, `ceph_rgw_qlen`) are valid for Ceph Reef (18.x) and earlier. On the Ceph main branch (Squid/19.x+), the op counters have been refactored with new names (e.g., `get_obj_ops`, `put_obj_ops`, `get_obj_bytes`, `put_obj_bytes`). If targeting Ceph Squid, readers should verify metric names for their deployment.
- The latency calculation correctly multiplies by 1000 to convert from seconds to milliseconds, as the `ceph_rgw_get_initial_lat_sum` metric uses Ceph's `time_avg` type which measures in seconds.
- The error rate PromQL division could produce NaN if there are zero total requests; in practice Grafana handles this gracefully, but a `> 0` filter on the denominator could be added for robustness.
