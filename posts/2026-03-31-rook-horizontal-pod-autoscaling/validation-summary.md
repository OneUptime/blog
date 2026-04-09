# Validation Summary: How to Configure Rook-Ceph Horizontal Pod Autoscaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephObjectStore, CephFilesystem)
- Kubernetes Horizontal Pod Autoscaler (autoscaling/v2)
- Kubernetes Metrics Server
- KEDA (Kubernetes Event-Driven Autoscaler)
- Prometheus
- Ceph RGW (RADOS Gateway)
- Ceph MDS (Metadata Server)

## Sources Consulted
- Rook source code: `pkg/operator/ceph/file/mds/spec.go` — confirms MDS Deployments are created with hardcoded `replicas: 1`, one Deployment per daemon
- Rook source code: `pkg/operator/ceph/file/mds/mds.go` — confirms MDS count is derived from `activeCount` in CephFilesystem CR
- Rook source code: `pkg/operator/ceph/object/spec.go` — confirms RGW uses a single Deployment with replicas from `gateway.instances`
- Rook GitHub issue #10001 — documents the Rook operator reconciliation conflict with HPA replica counts
- Rook CephObjectStore documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CephFilesystem documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- KEDA ScaledObject spec (v2.19): https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Prometheus scaler docs (v2.19): https://keda.sh/docs/2.19/scalers/prometheus/
- Kubernetes HPA documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Issues Found

### 1. MDS HPA section was fundamentally incorrect (Major)
**What was wrong:** Step 4 instructed readers to create an HPA targeting an MDS Deployment (`rook-ceph-mds-myfs-a`) to scale MDS. This does not work because Rook creates a separate Deployment for each MDS daemon, each hardcoded to `replicas: 1`. Scaling an individual MDS Deployment via HPA would create duplicate pods with the same daemon identity, causing conflicts. Additionally, the Rook operator resets replicas to 1 on every reconciliation.

**What was changed:** Replaced the incorrect HPA-for-MDS example with the correct approach: modifying `activeCount` in the CephFilesystem CR's `metadataServer` section. Added a CephFilesystem YAML example showing the correct configuration.

**Why:** MDS scaling in Rook is architecturally different from RGW. RGW uses a single Deployment with N replicas (HPA-compatible), while MDS uses N Deployments each with 1 replica (not HPA-compatible). The only supported way to scale MDS is through the CephFilesystem CR.

### 2. Intro incorrectly claimed HPA works for MDS (Minor)
**What was wrong:** The intro stated "Similarly, when CephFS metadata operations spike, HPA can scale the active MDS count."

**What was changed:** Reworded to clarify that MDS scaling is controlled through the CephFilesystem CR, not HPA.

### 3. Summary incorrectly claimed MDS supports HPA (Minor)
**What was wrong:** The summary stated "Rook-Ceph RGW and MDS support Horizontal Pod Autoscaling."

**What was changed:** Corrected to state that RGW supports HPA, while MDS scaling requires adjusting `activeCount` in the CephFilesystem CR.

### 4. KEDA ScaledObject included non-existent `metricName` field (Minor)
**What was wrong:** The KEDA Prometheus trigger metadata included `metricName: rgw_requests_total`, which is not a recognized parameter in the KEDA Prometheus scaler. KEDA auto-generates metric names internally.

**What was changed:** Removed the `metricName` field from the Prometheus trigger metadata.

## Review Notes
- The Rook operator reconciliation conflict with HPA (Step 6) is a real and well-documented issue (Rook GitHub issue #10001). The workaround of setting `instances` to match HPA's `minReplicas` is the commonly recommended approach, but users should be aware that brief flapping can occur during Rook reconciliation cycles.
- The `keda.sh/v1alpha1` API version is correct as of KEDA v2.19, despite the `v1alpha1` suffix.
- The KEDA `scaleTargetRef` omits `kind` and `apiVersion` fields, which default to `Deployment` and `apps/v1` respectively. This works correctly but is less explicit than the recommended form.
- The Ceph Prometheus metric `ceph_rgw_req` used in the KEDA query is correct for the Ceph MGR Prometheus module.
