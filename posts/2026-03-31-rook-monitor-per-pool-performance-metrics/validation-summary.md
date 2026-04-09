# Validation Summary: How to Monitor Per-Pool Performance Metrics in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- Prometheus (metrics and alerting)
- Grafana (dashboards)
- Prometheus Operator (PrometheusRule CRD)

## Sources Consulted
- Ceph CLI man page: https://www.mankier.com/8/ceph and https://manpages.debian.org/unstable/ceph-common/ceph.8.en.html
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Prometheus module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph PR #42674 (counter type fix): https://github.com/ceph/ceph/pull/42674
- Rook monitoring/grafana directory: https://github.com/rook/rook/tree/master/deploy/examples/monitoring/grafana/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph-cluster/values.yaml

## Issues Found

1. **Invalid CLI command `ceph osd pool stats detail`**: The `detail` subcommand does not exist for `ceph osd pool stats`. The command only accepts an optional pool name argument. Changed to `ceph df detail` which shows detailed per-pool storage usage (capacity, objects, percentage used), and updated the comment to match.

2. **Metric descriptions incorrectly described as rates**: `ceph_pool_rd`, `ceph_pool_wr`, `ceph_pool_rd_bytes`, and `ceph_pool_wr_bytes` are cumulative counters, not instantaneous rates. The table described them as "per second" and "bytes/sec" which is misleading. Updated descriptions to clarify they are counters (e.g., "Total read operations (counter)"). The PromQL examples in the post correctly use `rate()` on these counters, so no changes needed there.

3. **Non-existent Grafana dashboard filename**: The post referenced `pool-detail.json` which does not exist in the Rook repository. The actual file is `Ceph Pools Dashboard.json` located in `deploy/examples/monitoring/grafana/`. Fixed both the `ls` path and the dashboard filename.

4. **Invalid CRD field `rulesNamespaceOverride`**: This field is a Helm chart value (from `rook-ceph-cluster` chart's `values.yaml`), not a field in the CephCluster CRD spec. Showing it in a CephCluster YAML snippet is incorrect and would be silently ignored. Removed the field from the example, leaving only the valid `enabled: true` field.

## Review Notes
- The PromQL queries are correct and well-chosen for the use case. The `rate()` usage on counter metrics and the capacity percentage formula are both valid.
- The PrometheusRule alert definition is valid and uses correct Prometheus Operator API (`monitoring.coreos.com/v1`). The `$labels.name` reference is correct for Ceph pool metrics, and `humanizePercentage` is appropriate for the 0-1 range output.
- The default Prometheus exporter port 9283 for the Ceph MGR module is correct.
- The `kubectl exec` pattern targeting `deploy/rook-ceph-tools` is the standard Rook toolbox access method.
