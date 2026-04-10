# Validation Summary: How to Configure Ceph Storage for Kubernetes Volume Snapshots

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Rook-Ceph (CSI-based Ceph storage orchestrator for Kubernetes)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes VolumeSnapshots (snapshot.storage.k8s.io/v1)
- kubernetes-csi/external-snapshotter (v6.3.0)
- Ceph RBD (RADOS Block Device)
- kubectl CLI

## Sources Consulted
- Rook official documentation for RBD block storage: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook official documentation for CSI snapshots: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Rook example StorageClass: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml
- Rook example VolumeSnapshotClass: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/snapshotclass.yaml
- kubernetes-csi/external-snapshotter v6.3.0 release: https://github.com/kubernetes-csi/external-snapshotter/releases/tag/v6.3.0
- external-snapshotter snapshot controller deployment files (v6.3.0): https://github.com/kubernetes-csi/external-snapshotter/tree/v6.3.0/deploy/kubernetes/snapshot-controller/
- Ceph CSI source code (internal/rbd/controllerserver.go) for volume handle and volume attributes format

## Issues Found
- **Step 5 — Incorrect RBD image name extraction from CSI volume handle**: The original command used `cut -d'-' -f3-` on the CSI volume handle to extract the RBD image name, then prepended `csi-vol-`. This is incorrect because the CSI volume handle format is `<version>-<clusterID_len>-<clusterID>-<poolID>-<objectUUID>`, and the clusterID itself contains hyphens (e.g., `rook-ceph`). The `cut` command would include the clusterID and poolID in the result, producing an invalid image name like `csi-vol-rook-ceph-0000000000000001-<uuid>` instead of the correct `csi-vol-<uuid>`. Fixed by replacing the command with one that reads `.spec.csi.volumeAttributes.imageName` from the PV, which directly provides the correct RBD image name as set by the Ceph CSI driver.

## Review Notes
- The post does not mention installing VolumeSnapshot CRDs (from `client/config/crd/` in the external-snapshotter repo), which are a prerequisite for the snapshot controller. Many managed Kubernetes distributions and Rook installations pre-install these, but readers installing the snapshot controller manually may also need the CRDs.
- The StorageClass omits `csi.storage.k8s.io/controller-publish-secret-name` and `csi.storage.k8s.io/controller-publish-secret-namespace` parameters that appear in the official Rook example. These are not strictly required for basic RBD block storage but are included in the upstream example for completeness.
- The external-snapshotter v6.3.0 was released on 2023-09-14. Newer versions are available, but v6.3.0 remains functional and the URLs are valid.
- All other configuration snippets (StorageClass, VolumeSnapshotClass, PVC, VolumeSnapshot) match the official Rook documentation and are technically correct.
