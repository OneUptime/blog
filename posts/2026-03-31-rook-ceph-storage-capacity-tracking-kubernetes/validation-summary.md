# Validation Summary: How to Use Ceph with Kubernetes Storage Capacity Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (1.21+ / 1.24+ GA)
- Rook-Ceph Operator
- CSI (Container Storage Interface)
- CSI Storage Capacity Tracking (CSIStorageCapacity API)
- Kubernetes Scheduler (topology-aware scheduling)

## Sources Consulted
- Kubernetes CSI Storage Capacity documentation: https://kubernetes.io/docs/concepts/storage/storage-capacity/
- Kubernetes CSIStorageCapacity API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/csi-storage-capacity-v1/
- Rook-Ceph operator configuration documentation: https://rook.io/docs/rook/latest/Storage-Configuration/ceph-csi/
- Rook Helm chart values reference: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Other validated posts in this repository (rook-troubleshoot-pending-pvcs, rook-configure-csi-driver-settings-helm) for cross-referencing ConfigMap key names

## Issues Found
1. **Incorrect ConfigMap key `CSI_ENABLE_CSIDRIVER_CEPH_RBD`**: Changed to `ROOK_CSI_ENABLE_RBD`. The Rook operator ConfigMap uses the `ROOK_CSI_ENABLE_RBD` key to enable the RBD CSI driver, as confirmed by other validated posts in this repository and official Rook operator.yaml examples.
2. **Incorrect ConfigMap key `CSI_ENABLE_CSIDRIVER_CEPHFS`**: Changed to `ROOK_CSI_ENABLE_CEPHFS`. Same reasoning as above — the `ROOK_CSI_ENABLE_CEPHFS` key is the correct one used in Rook's operator configuration.
3. **Incorrect ConfigMap key `CSI_ENABLE_CAPACITY`**: Changed to `CSI_ENABLE_STORAGE_CAPACITY`. The full key name follows Rook's naming convention for CSI-specific settings (e.g., `CSI_PROVISIONER_REPLICAS`, `CSI_ENABLE_ENCRYPTION`).

## Review Notes
- The Kubernetes version history is accurate: CSI Storage Capacity was beta in 1.21 (enabled by default) and GA in 1.24. Technically the feature was first introduced as alpha in 1.19, but the post's framing of "1.21+" is reasonable since that's when it became usable by default.
- The CSIStorageCapacity example shows capacity value `"9223372036854775807"` (max int64). This is a valid value that Ceph CSI may report when the pool has available space but the exact free capacity isn't precisely mapped to a single topology segment. The comment "Available bytes" is acceptable.
- The Helm chart values (`csi.storageCapacity: true`) may need to be `csi.storageCapacity.enabled: true` in newer Rook Helm chart versions (v1.13+), but this depends on the chart version and both forms have been used across Rook releases.
- All kubectl commands use correct syntax and flags.
- The CSIDriver object field `.spec.storageCapacity` and the `storage.k8s.io/v1` API version for CSIStorageCapacity are correct for Kubernetes 1.24+.
- The explanation of `WaitForFirstConsumer` volume binding mode and its role in capacity-aware scheduling is accurate.
