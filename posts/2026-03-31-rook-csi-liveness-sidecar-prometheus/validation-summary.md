# Validation Summary: How to Configure CSI Liveness Sidecar for Prometheus in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI drivers (RBD, CephFS)
- ceph-csi liveness sidecar
- Prometheus / Prometheus Operator
- Kubernetes ServiceMonitor and PrometheusRule CRDs
- Helm

## Sources Consulted
- Rook Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook operator Helm chart documentation: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- ceph-csi liveness implementation: https://github.com/ceph/ceph-csi/blob/devel/internal/liveness/liveness.go
- Rook CSI spec source code (spec.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/spec.go
- Rook CSI DaemonSet templates: https://github.com/rook/rook/tree/master/pkg/operator/ceph/csi/template

## Issues Found

1. **Incorrect Helm value names for liveness ports**: The post used `csi.rbdLivenessPort` and `csi.cephfsLivenessPort`, but the correct Rook Helm chart values are `csi.rbdLivenessMetricsPort` and `csi.cephfsLivenessMetricsPort`. Fixed both names.

2. **NFS liveness sidecar does not exist**: The post claimed NFS supports a liveness sidecar with `csi.nfsLivenessPort: 9082`. The Rook NFS plugin DaemonSet template has no liveness sidecar container, and there is no corresponding Helm value. Removed all NFS liveness references.

3. **Wrong metric names**: The post claimed the liveness sidecar exposes `csi_liveness_probe_total` (counter) and `csi_liveness_probe_failures_total` (counter). The actual metric exposed by ceph-csi is `csi_liveness`, a **gauge** set to `1` when the CSI plugin is healthy and `0` when it is not. Fixed the expected metrics output.

4. **Wrong ServiceMonitor port name**: The post used `port: liveness-port`, but the actual port name in the Rook-created CSI metrics Service is `csi-http-metrics`. Fixed the ServiceMonitor spec.

5. **Alert rule used non-existent metric**: The PrometheusRule used `rate(csi_liveness_probe_failures_total{driver_name="rbd.csi.ceph.com"}[5m]) > 0`, which references a metric that does not exist. Changed to `csi_liveness == 0` to correctly alert when the gauge indicates the driver is unhealthy.

## Review Notes
- The default value for `rbdLivenessMetricsPort` has some ambiguity: Rook's Go source code defaults to `9080`, but the Helm chart `values.yaml` annotation and the ceph-csi binary default to `8080`. The post uses `9080`, which aligns with Rook's operator default. Users should verify the port matches their deployment.
- When using the newer CSI Operator mode (`csi.rookUseCsiOperator: true`), pod naming conventions change (e.g., `rook-ceph.rbd.csi.ceph.com-nodeplugin-*` instead of `csi-rbdplugin-*`). The blog's `kubectl` examples assume the classic naming.
- The ServiceMonitor selector uses `app: csi-rbdplugin` to match pods, but ServiceMonitors actually select Services, not Pods. The Rook-created metrics Service (`csi-rbdplugin-metrics`) may have different labels (e.g., `app: csi-metrics`). Users should verify the Service labels in their cluster with `kubectl -n rook-ceph get svc csi-rbdplugin-metrics --show-labels`.
