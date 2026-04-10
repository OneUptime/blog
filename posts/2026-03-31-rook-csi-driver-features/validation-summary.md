# Validation Summary: How to Use Ceph CSI Driver Features in Rook

## Status
validated

## Post Type
Guide / Feature Overview

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI Driver (RBD and CephFS)
- Kubernetes StorageClass, PersistentVolumeClaim, VolumeSnapshot
- Kubernetes CSI (Container Storage Interface)
- LUKS encryption via Ceph CSI KMS integration

## Sources Consulted
- Rook official documentation: Ceph CSI Drivers — https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook CephCluster CRD specification — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Kubernetes documentation: Volume Cloning — https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/
- Kubernetes documentation: Volume Snapshots — https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes documentation: StorageClass — https://kubernetes.io/docs/concepts/storage/storage-classes/
- GitHub Issue rook/rook#7987 — confirms `rook-ceph-csi-config` ConfigMap is operator-managed
- GitHub Issue rook/rook#15639 — CSI ReadAffinity configuration via CephCluster CR

## Issues Found
1. **ReadAffinity configuration method was incorrect for Rook deployments.** The post showed directly editing the `rook-ceph-csi-config` ConfigMap with `readAffinity` settings. In a Rook-managed deployment, this ConfigMap is managed by the Rook operator and manual edits are overwritten on operator restart or reconciliation. **Fix:** Replaced the ConfigMap example with the correct CephCluster CR approach (`spec.csi.readAffinity`), added a note warning against manual ConfigMap editing, and added the Linux kernel 5.8 requirement for the KRBD `read_from_replica` option.

## Review Notes
- The encryption section references `encryptionKMSID: rook-encryption-kms` without showing how to define the KMS connection configuration (typically done in a `rook-ceph-csi-kms-config` ConfigMap). This is acceptable for a feature overview but readers will need the Rook encryption docs for full setup.
- All StorageClass YAML examples use correct parameter names and standard Rook secret references (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`).
- The VolumeSnapshot API version `snapshot.storage.k8s.io/v1` is correct (GA since Kubernetes 1.20).
- The `imageFeatures: layering` is valid, though production deployments often also enable `exclusive-lock`, `object-map`, `fast-diff`, and `deep-flatten`.
