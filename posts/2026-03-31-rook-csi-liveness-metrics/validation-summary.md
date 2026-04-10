# Validation Summary: How to Monitor CSI Liveness Metrics in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI drivers (ceph-csi)
- Kubernetes (ConfigMaps, DaemonSets, port-forwarding)
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- Container Storage Interface (CSI) liveness probes

## Sources Consulted
- Rook CSI operator source code: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/csi.go
- ceph-csi liveness implementation: https://github.com/ceph/ceph-csi/blob/devel/internal/liveness/liveness.go
- ceph-csi RBD plugin manifest: https://github.com/ceph/ceph-csi/blob/devel/deploy/rbd/kubernetes/csi-rbdplugin.yaml
- Rook CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook monitoring documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Monitoring/ceph-monitoring/

## Issues Found

1. **Liveness metrics default state was incorrect**: The post stated "Liveness metrics are enabled by default in recent Rook versions." In reality, `CSI_ENABLE_LIVENESS` defaults to `"false"` in Rook. Changed to state that liveness metrics are disabled by default.

2. **Incorrect ConfigMap key for liveness port**: The post used `CSI_LIVENESS_METRICS_PORT`, which is not a valid Rook operator config key. Rook uses driver-specific keys: `CSI_RBD_LIVENESS_METRICS_PORT` (default 9080) and `CSI_CEPHFS_LIVENESS_METRICS_PORT` (default 9081). Updated the ConfigMap example to use both correct keys.

3. **Incorrect metric names**: The post referenced `liveness_probe_result` and `liveness_probe_latency_seconds`, which are fabricated metric names. The actual ceph-csi liveness metric is `csi_liveness` (a Prometheus gauge: 1 = healthy, 0 = unhealthy). Updated the metrics example, PrometheusRule alert expression, and summary section to use the correct metric name.

## Review Notes
- The ServiceMonitor targets only RBD CSI plugin pods (`app: csi-rbdplugin`). Users who also use CephFS would need a separate ServiceMonitor or an updated selector to cover `app: csi-cephfsplugin` pods as well. This is not an error but a scope limitation worth noting.
- The port-forward example uses port 9080, which is correct for the RBD liveness metrics default port.
- The `liveness-prometheus` container name and `app: csi-rbdplugin` label selector are both correct.
