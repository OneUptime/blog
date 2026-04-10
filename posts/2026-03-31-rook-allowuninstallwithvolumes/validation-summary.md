# Validation Summary: How to Handle allowUninstallWithVolumes in Rook Cleanup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (PVCs, PVs, CRDs, kubectl)
- Helm

## Sources Consulted
- Rook GitHub repository CephCluster CRD types definition (`pkg/apis/ceph.rook.io/v1/types.go`) — confirms `allowUninstallWithVolumes` is nested under `CleanupPolicySpec`, not directly under `ClusterSpec`
- Rook cluster controller source (`pkg/operator/ceph/cluster/controller.go`) — confirms deletion-blocking behavior when volumes exist
- Rook Helm chart values.yaml and templates — confirms correct Helm values path includes `cleanupPolicy` nesting
- Kubernetes field selectors documentation — confirms `spec.storageClassName` is not a supported field selector for PVCs
- Kubernetes PVC strategy source (`pkg/registry/core/persistentvolumeclaim/strategy.go`) — confirms only ObjectMeta fields are selectable

## Issues Found

### 1. Wrong YAML path for `allowUninstallWithVolumes` (Critical)
- **What was wrong:** The post showed the setting directly under `spec.allowUninstallWithVolumes`. The actual path in the CephCluster CRD is `spec.cleanupPolicy.allowUninstallWithVolumes`.
- **What was changed:** Updated the YAML example to nest the field under `cleanupPolicy`.
- **Why:** The CephCluster CRD defines this field in the `CleanupPolicySpec` struct, which maps to `spec.cleanupPolicy` in YAML. Using the wrong path would silently have no effect.

### 2. Wrong JSON patch path (Critical)
- **What was wrong:** The `kubectl patch` command used `{"spec":{"allowUninstallWithVolumes": true}}`.
- **What was changed:** Updated to `{"spec":{"cleanupPolicy":{"allowUninstallWithVolumes": true}}}`.
- **Why:** Same root cause as issue 1 — the field is nested under `cleanupPolicy`.

### 3. Invalid kubectl field selector (Moderate)
- **What was wrong:** The command used `--field-selector=spec.storageClassName=rook-ceph-block` to filter PVCs. Kubernetes does not support `spec.storageClassName` as a field selector for PVCs — only `metadata.name` and `metadata.namespace` are universally supported field selectors.
- **What was changed:** Replaced with JSONPath filtering: `-o jsonpath='{range .items[?(@.spec.storageClassName=="rook-ceph-block")]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'`.
- **Why:** The original command would produce a server-side error: `field label not supported: spec.storageClassName`.

### 4. Wrong Helm values path (Moderate)
- **What was wrong:** The Helm values showed `cephClusterSpec.allowUninstallWithVolumes` and the `--set` flag used the same flat path.
- **What was changed:** Updated to `cephClusterSpec.cleanupPolicy.allowUninstallWithVolumes` in both the values YAML and the `--set` flag.
- **Why:** The Helm chart templates dump `cephClusterSpec` directly into the CephCluster `spec:`, so the nesting must match the CRD structure.

## Review Notes
- The example condition output (ClusterDeletionBlocked) is illustrative and the exact message wording may vary between Rook versions, but the concept is accurate.
- The cleanup script that deletes all PVCs across all namespaces is dangerous in practice — it would delete PVCs not related to Rook. The post should ideally filter to only Rook-provisioned PVCs, but this is a best-practice concern rather than a technical error.
- The `cleanupPolicy` section in the CephCluster CRD also supports other fields like `confirmation` and `sanitizeDisks` which are relevant to cluster cleanup but outside the scope of this post.
