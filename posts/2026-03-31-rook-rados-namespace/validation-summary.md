# Validation Summary: How to Use CephBlockPoolRadosNamespace in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes-native Ceph operator)
- Ceph (distributed storage) — RBD (RADOS Block Device)
- RADOS namespaces
- Kubernetes — StorageClass, PersistentVolumeClaim
- Ceph-CSI (Container Storage Interface driver)

## Sources Consulted
- https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-rados-namespace-crd/ — Official Rook CephBlockPoolRadosNamespace CRD documentation
- https://rook.io/docs/rook/v1.9/ceph-pool-radosnamespace.html — Rook v1.9 RADOS namespace documentation (feature introduction)
- https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/ — Ceph official RBD command reference
- https://github.com/rook/rook/releases/tag/v1.9.0 — Rook v1.9.0 release notes confirming feature introduction
- https://github.com/ceph/ceph-csi — Ceph-CSI driver repository and StorageClass parameter documentation

## Issues Found

### Issue 1: Incorrect minimum version in Prerequisites
- **What was wrong:** The post stated "Rook v1.10+" as the minimum version. `CephBlockPoolRadosNamespace` was introduced in Rook v1.9.0, as confirmed by the v1.9.0 release notes ("A CephBlockPoolRadosNamespace CRD is provided to create RADOS namespaces in a pool.").
- **What was changed:** Changed "Rook v1.10+" to "Rook v1.9+".

### Issue 2: Incorrect StorageClass parameters — non-existent `radosNamespaceName` field and wrong `clusterID`
- **What was wrong:** The StorageClass YAMLs used two incorrect values:
  1. `radosNamespaceName: team-a-namespace` — this is not a valid Ceph-CSI or Rook StorageClass parameter.
  2. `clusterID: rook-ceph` — this is the main Ceph cluster ID. When using the `CephBlockPoolRadosNamespace` CRD, each namespace resource generates its own unique `clusterID` in `.status.info.clusterID`. The StorageClass must reference that namespace-specific `clusterID`, not the main cluster ID.
- **What was changed:** Removed the `radosNamespaceName` parameter entirely. Updated `clusterID` in both StorageClass examples to use placeholder comments referencing the namespace-specific clusterID. Added a `kubectl` command block showing how to extract the `clusterID` from each `CephBlockPoolRadosNamespace` resource's status before creating the StorageClass. This matches the official Rook documentation pattern.

## Review Notes
- The `rbd ls <pool> --namespace <namespace>` and `rbd info <pool>/<image> --namespace <namespace>` command forms are valid; the Ceph CLI accepts the `--namespace` flag in multiple positions.
- The `blockPoolName` spec field in `CephBlockPoolRadosNamespace` is correct per official docs.
- The provisioner name `rook-ceph.rbd.csi.ceph.com` is correct for a Rook deployment in the default `rook-ceph` namespace.
- The CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) are the correct Rook defaults.
- The mermaid architecture diagram is accurate and helpful, though it may give the impression that the StorageClass flows directly from the RBD images rather than from the RADOS namespace resource — acceptable as a high-level overview.
- The `CephBlockPoolRadosNamespace` spec also supports an optional `name` field to override the RADOS namespace name (defaults to `metadata.name`). This is undocumented in the post but not incorrect.
