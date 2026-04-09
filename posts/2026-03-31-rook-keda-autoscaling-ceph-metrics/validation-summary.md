# Validation Summary: How to Set Up KEDA Horizontal Pod Autoscaling with Rook-Ceph Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- KEDA (Kubernetes Event-Driven Autoscaling)
- Rook-Ceph (Ceph storage orchestrator for Kubernetes)
- Prometheus (metrics and monitoring)
- Kubernetes HPA (Horizontal Pod Autoscaler)
- Helm

## Sources Consulted
- KEDA Helm deployment docs: https://keda.sh/docs/2.16/deploy/
- KEDA ScaledObject spec reference: https://keda.sh/docs/2.16/reference/scaledobject-spec/
- KEDA Prometheus scaler docs: https://keda.sh/docs/2.16/scalers/prometheus/
- KEDA ClusterTriggerAuthentication docs: https://keda.sh/docs/2.16/concepts/authentication/
- Ceph Prometheus module metric definitions: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph source code for OSD perf counters (osd_perf_counters.h)

## Issues Found

1. **Missing `helm repo update` command**: The Helm install instructions were missing `helm repo update` between `helm repo add` and `helm install`. Added the missing step per KEDA official docs.

2. **Invalid `metricName` field in Prometheus trigger metadata**: All three ScaledObject examples included a `metricName` field in the Prometheus trigger metadata. This field does not exist in the current KEDA Prometheus scaler specification (KEDA 2.x). Removed `metricName` from all three trigger definitions.

3. **Incorrect Ceph metric name `ceph_pool_write_ops_total`**: This metric does not exist in Ceph's Prometheus module. The correct metric for pool write operations is `ceph_pool_wr`. Changed the query to use `ceph_pool_wr`.

4. **Incorrect `pool_name` label on pool metrics**: Ceph pool metrics use `pool_id` as their label, not `pool_name`. Changed the query filter from `pool_name="replicapool"` to `pool_id="3"` (pool ID must be used directly, or a label join with `ceph_pool_metadata` is needed to filter by name).

5. **Incorrect HPA label selector**: The command `kubectl get hpa -l scaledobject.keda.sh/name=storage-worker-scaler` used an incorrect label. KEDA applies the label `app.kubernetes.io/part-of` to HPAs it creates. Changed to `kubectl get hpa -l app.kubernetes.io/part-of=storage-worker-scaler`.

## Review Notes
- The `ceph_osd_op_wip` metric is valid but is a dynamically-exported OSD perf counter. In Ceph Reef and later, availability depends on whether the `ceph-exporter` daemon is running and the `exclude_perf_counters` configuration. This is worth noting for users on newer Ceph versions.
- The pool IOPS query now uses `pool_id` directly. Users who want to filter by pool name instead would need a PromQL label join: `sum(rate(ceph_pool_wr[2m]) * on(pool_id) group_left(name) ceph_pool_metadata{name="replicapool"})`. The simpler `pool_id` approach was chosen to keep the example straightforward.
- The `ClusterTriggerAuthentication` example with empty `secretTargetRef` is technically valid but not very useful in practice. It serves as a placeholder showing where authentication would be configured.
