# Validation Summary: How to Set Up CSI Liveness Metrics in Rook Helm Chart

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Ceph CSI drivers (RBD and CephFS)
- Kubernetes CSI (Container Storage Interface)
- Helm (Kubernetes package manager)
- Prometheus (monitoring and alerting)
- ServiceMonitor (Prometheus Operator CRD)

## Sources Consulted
- Rook operator Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook CSI driver template (csi-rbdplugin.yaml, csi-cephfsplugin.yaml): https://github.com/rook/rook/tree/master/deploy/charts/rook-ceph/templates
- Rook Go operator CSI spec defaults (pkg/operator/ceph/csi/spec.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/spec.go
- Ceph CSI liveness probe source (internal/liveness/liveness.go): https://github.com/ceph/ceph-csi/blob/devel/internal/liveness/liveness.go
- Rook CSI drivers documentation: https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Ceph-CSI/ceph-csi-drivers.md
- Rook Helm chart installation docs: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/

## Issues Found

### Issue 1: Inverted csi_liveness metric values (Critical)
- **What was wrong:** The post stated `csi_liveness - Reports 0 (alive) or 1 (dead) per driver`. In reality, the Ceph CSI liveness code sets the gauge to `1` when the probe succeeds (alive) and `0` when it fails (dead). The values were backwards.
- **What was changed:** Corrected to `csi_liveness - Reports 1 (alive) or 0 (dead) per driver`.
- **Why:** The Ceph CSI source code (`internal/liveness/liveness.go`) sets the Prometheus gauge to 1 on successful probe and 0 on failure. The original text would mislead readers into misinterpreting their monitoring data.

### Issue 2: Incorrect Prometheus alert expression (Critical)
- **What was wrong:** The alert rule used `expr: csi_liveness > 0`, which would fire when the driver is alive (reporting 1), the exact opposite of the intended behavior.
- **What was changed:** Corrected to `expr: csi_liveness == 0`.
- **Why:** Since `csi_liveness == 1` means healthy and `csi_liveness == 0` means unhealthy, the alert should trigger when the metric equals 0 (driver down), not when it's greater than 0 (driver up).

## Review Notes
- The Rook Helm chart `values.yaml` annotates the `rbdLivenessMetricsPort` default as 8080 in its comment, but the actual Go operator code default (`DefaultRBDLivenessMerticsPort`) is 9080. The blog correctly uses 9080, which is the runtime default.
- The `csi_liveness` metric is registered by the Ceph CSI driver itself (running in `--type=liveness` mode), not by the upstream `kubernetes-csi/livenessprobe` sidecar. The blog's description is functionally correct but readers should be aware the metric comes from the Ceph CSI image, not a separate Kubernetes CSI sidecar.
- The ServiceMonitor example uses reasonable label selectors (`app: csi-metrics`) and port name (`csi-http-metrics`) that align with how Rook creates CSI metric services, though exact names may vary by Rook version.
