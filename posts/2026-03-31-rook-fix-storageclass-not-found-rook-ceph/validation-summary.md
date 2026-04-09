# Validation Summary: How to Fix StorageClass Not Found with Rook-Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Kubernetes StorageClass, PersistentVolumeClaim (PVC)
- CephBlockPool (Rook CRD)
- CSI (Container Storage Interface) RBD driver
- kubectl CLI

## Sources Consulted
- Rook official documentation: Block Storage (StorageClass) configuration — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook official documentation: CephBlockPool CRD — https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Kubernetes official documentation: StorageClass — https://kubernetes.io/docs/concepts/storage/storage-classes/
- Rook CSI driver documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/
- Cross-referenced against 180+ other Rook blog posts in this repository for consistency of provisioner names, secret names, and parameter patterns

## Issues Found
- **CSI secret creation trigger (Step 4)**: The post originally stated that CSI secrets (`rook-csi-rbd-provisioner` and `rook-csi-rbd-node`) are "created automatically by the Rook operator when a CephBlockPool is ready." This is inaccurate — these secrets are created during CSI driver initialization when the CephCluster is healthy, not specifically when a CephBlockPool becomes ready. If the secrets are missing, it indicates a CephCluster or operator initialization issue, not a pool reconciliation issue. Updated the text to reflect that the secrets are tied to CephCluster health and CSI initialization.

## Review Notes
- The StorageClass YAML uses the correct CSI provisioner name `rook-ceph.rbd.csi.ceph.com`, matching the default Rook operator namespace convention (`<operator-namespace>.rbd.csi.ceph.com`).
- All CSI secret parameter names and values are correct and consistent with Rook's official examples.
- The `clusterID` verification command (`kubectl -n rook-ceph get cephcluster -o jsonpath='{.items[0].metadata.namespace}'`) is technically correct but somewhat circular since the `-n rook-ceph` flag already filters to that namespace. A reader might find it more useful to first list CephClusters across all namespaces (`kubectl get cephcluster --all-namespaces`), but the current approach works as a quick existence check.
- The `imageFormat: "2"` and `imageFeatures: layering` parameters are standard and correct for RBD-based StorageClasses.
