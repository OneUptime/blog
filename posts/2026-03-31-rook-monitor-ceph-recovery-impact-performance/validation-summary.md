# Validation Summary: How to Monitor Ceph Recovery Impact on Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Prometheus (monitoring and alerting)
- Grafana (visualization)
- Kubernetes (container orchestration)
- PrometheusRule CRD (alerting rules)

## Sources Consulted
- Ceph official documentation: OSD configuration reference for `osd_max_backfills`, `osd_recovery_sleep`, `osd_recovery_op_priority`, `osd_client_op_priority` — https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph CLI reference for `ceph pg` subcommands (`pg ls`, `pg dump_stuck`) — https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph MGR Prometheus module metric names — https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

1. **Incorrect default value for `osd_max_backfills`**: The post stated the default is 3, but the actual Ceph default is 1. Fixed the comment from `(default: 3)` to `(default: 1)`.

2. **Misleading comment on `osd_recovery_sleep`**: The comment said "Reduce recovery sleep to throttle throughput," but setting this parameter to 0.1 actually *increases* the sleep interval from the default of 0 seconds, thereby throttling recovery. Fixed the comment to "Increase recovery sleep to throttle throughput (default: 0)."

3. **Non-existent Prometheus metric `ceph_osd_recovering_objects_pushed`**: This is not a standard metric exposed by the Ceph MGR Prometheus module. Changed to `ceph_osd_recovery_ops`, which tracks recovery operations and is a standard OSD perf counter metric.

4. **Non-existent Prometheus metrics `ceph_cluster_total_bytes_written` / `ceph_cluster_total_bytes_read`**: These are not standard Ceph Prometheus metrics. Client IO throughput is available at the pool level. Changed to `sum(rate(ceph_pool_wr_bytes[5m]))` and `sum(rate(ceph_pool_rd_bytes[5m]))` respectively, which aggregate write and read throughput across all pools.

5. **Invalid argument to `ceph pg dump_stuck`**: The command `ceph pg dump_stuck recovering` is invalid — `recovering` is not a valid filter for `dump_stuck` (valid options are `inactive`, `unclean`, `stale`, `undersized`, `degraded`). Changed to `ceph pg ls recovering`, which correctly lists PGs currently in the recovering state.

## Review Notes
- The `spec.cephConfig` section in the CephCluster CRD YAML should be verified against the specific Rook version being used. The field name and format may vary across Rook releases. The `rook-config-override` ConfigMap or `ceph config set` commands via the toolbox are universally supported alternatives for persistent Ceph configuration.
- The `ceph_pg_degraded` metric used in the PrometheusRule alert tracks degraded objects rather than degraded PGs. The alert logic (> 0 for 2h) is still functionally correct for detecting extended recovery, but operators should be aware that the `$value` in the annotation represents degraded object count, not PG count.
- The priority values mentioned (client default 63, recovery default 3) are correct for Ceph's mClock/WPQ scheduler. These defaults apply when using the default `osd_op_queue` setting.
