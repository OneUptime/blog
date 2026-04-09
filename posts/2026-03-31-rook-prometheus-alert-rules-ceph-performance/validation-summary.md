# Validation Summary: How to Create Prometheus Alert Rules for Ceph Performance

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Prometheus (monitoring and alerting)
- Prometheus Operator / PrometheusRule CRD
- Kubernetes
- Ceph MGR Prometheus module metrics
- Ceph RGW (RADOS Gateway)

## Sources Consulted
- Ceph Prometheus module metric names: https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus alerting rules syntax: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template functions (`humanizePercentage`, `humanizeDuration`): https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Ceph CLI reference (`ceph health detail`): https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/

## Issues Found

### Issue 1: Invalid Ceph CLI command in Slow Operations Alert
- **What was wrong:** The annotation description referenced `ceph ops` as a command to investigate slow operations. This is not a valid Ceph CLI command.
- **What was changed:** Replaced `ceph ops` with `ceph health detail`, which is the correct command for viewing details about health warnings including SLOW_OPS.
- **Why:** Running `ceph ops` would produce an error. `ceph health detail` provides the relevant slow ops information at the cluster level.

### Issue 2: Incorrect use of `humanizePercentage` in RGW error rate alert
- **What was wrong:** The PromQL expression computed `(rate(failed) / rate(total)) * 100 > 5`, yielding a value in the 0-100 range (e.g., 5.2 for 5.2%). The annotation then applied `humanizePercentage`, which expects a ratio in the 0-1 range. A value of 5.2 would be rendered as "520%" instead of "5.2%".
- **What was changed:** Removed the `* 100` multiplication and changed the threshold from `> 5` to `> 0.05` so the expression yields a ratio (e.g., 0.052). `humanizePercentage` then correctly formats this as "5.2%".
- **Why:** Prometheus's `humanizePercentage` multiplies the input by 100 and appends "%". Passing an already-multiplied value results in a doubly-multiplied display.

## Review Notes
- All Ceph metric names (`ceph_osd_apply_latency_ms`, `ceph_osd_commit_latency_ms`, `ceph_health_detail`, `ceph_pg_recovering`, `ceph_osd_recovery_ops`, `ceph_rgw_failed_req`, `ceph_rgw_req`, `ceph_rgw_get_b`, `ceph_rgw_put_b`, `ceph_osd_op_r`, `ceph_osd_op_w_latency_sum`, `ceph_osd_op_w_latency_count`) are valid metrics exposed by the Ceph MGR Prometheus module.
- The `osd_op_complaint_time` default of 30s is correct.
- Alert thresholds (100ms apply latency, 200ms commit latency, 1000ms critical) are reasonable operational values.
- The PrometheusRule CRD manifest uses the correct `monitoring.coreos.com/v1` API version.
- The `CephLowClientReadIOPS` alert with a threshold of 10 IOPS is very low and may only be useful for detecting a completely idle cluster rather than performance degradation. This is not an error but something operators should tune to their workload.
- The `CephRGWLowThroughput` alert threshold of 1048576 bytes/s (1 MiB/s) is similarly very low and most useful for detecting near-zero activity rather than throughput degradation in production RGW workloads.
