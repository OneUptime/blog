# Validation Summary: How to Troubleshoot CSI Provisioner Pod Issues in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes CSI (Container Storage Interface)
- kubectl CLI
- CSI sidecar containers (provisioner, snapshotter, attacher)

## Sources Consulted
- Rook GitHub repository source code (github.com/rook/rook) — deployment templates at `pkg/operator/ceph/csi/template/rbd/csi-rbdplugin-provisioner-dep.yaml`, secrets definitions at `pkg/operator/ceph/csi/secrets.go`, operator settings at `pkg/operator/ceph/csi/csi.go` and `spec.go`
- Rook `deploy/examples/common.yaml` for RBAC resource names (ClusterRole, ClusterRoleBinding definitions)
- Rook operator predicate logic at `pkg/operator/ceph/cluster/predicate.go` for reconciliation trigger behavior
- Rook official documentation at rook.io/docs for ConfigMap-based operator configuration (`rook-ceph-operator-config`)

## Issues Found

### 1. Incorrect ClusterRoleBinding name (Step 4)
- **What was wrong:** The command referenced `rook-csi-rbd-provisioner-role` as the ClusterRoleBinding name.
- **What was changed:** Corrected to `rbd-csi-provisioner-role`, which matches the actual resource name defined in Rook's `deploy/examples/common.yaml`.
- **Why:** Using the wrong name would return a "not found" error, potentially misleading users into thinking RBAC is misconfigured when it is actually fine.

### 2. Incorrect reconciliation trigger method (Step 4)
- **What was wrong:** The post suggested patching an annotation on the CephCluster CR (`rook-reconcile`) to trigger operator reconciliation. The Rook operator's update predicate (`watchControllerPredicate`) only triggers reconciliation on `.spec` changes (which increment `.metadata.generation`). Annotation-only changes do not increment generation and are silently ignored by the predicate.
- **What was changed:** Replaced the `kubectl patch` annotation approach with `kubectl rollout restart deployment/rook-ceph-operator -n rook-ceph`, which reliably triggers a full reconciliation of all managed resources.
- **Why:** The original command would execute without error but would not actually cause the operator to reconcile, leaving the user stuck with missing secrets.

## Review Notes
- The post correctly identifies the CSI provisioner pod label selectors (`app=csi-rbdplugin-provisioner`, `app=csi-cephfsplugin-provisioner`), container names (`csi-provisioner`, `csi-rbdplugin`, `csi-snapshotter`), deployment names, and secret names — all verified against Rook source code.
- The `CSI_LOG_LEVEL` and `CSI_GRPC_TIMEOUT_SECONDS` settings in the `rook-ceph-operator-config` ConfigMap are correct and documented in Rook's example operator configuration.
- The provisioner pod contains additional containers beyond the three mentioned (e.g., `csi-resizer`, `csi-attacher`, `liveness-prometheus`, optionally `csi-addons` and `csi-omap-generator`). The post covers the most commonly relevant ones, which is appropriate for a troubleshooting guide.
- The mention of `FailedAttachVolume` events alongside provisioner issues is technically valid since the CSI attacher sidecar runs in the same provisioner pod deployment, though it could be clearer that attach failures and provisioning failures are distinct symptoms.
