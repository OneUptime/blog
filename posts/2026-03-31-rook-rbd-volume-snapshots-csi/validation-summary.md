# Validation Summary: How to Create RBD Volume Snapshots with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (1.9+)
- Ceph RBD (RADOS Block Device)
- Kubernetes (1.20+)
- CSI (Container Storage Interface) Volume Snapshots
- Kubernetes VolumeSnapshot API (snapshot.storage.k8s.io/v1)

## Sources Consulted
- Rook official documentation on RBD snapshots: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI snapshot API reference for snapshot.storage.k8s.io/v1
- Rook example manifests for VolumeSnapshotClass (csi/rbd/snapshotclass.yaml in Rook repository)

## Issues Found
No technical issues found.

## Review Notes
- The VolumeSnapshotClass YAML matches the official Rook example manifests closely, using the correct driver name (`rook-ceph.rbd.csi.ceph.com`), secret references, and deletion policy.
- The `snapshot.storage.k8s.io/v1` API version is correct for Kubernetes 1.20+ where VolumeSnapshots reached GA status.
- The PVC restore example correctly uses `dataSource` with `apiGroup: snapshot.storage.k8s.io` and `kind: VolumeSnapshot`.
- The prerequisite about installing snapshot CRDs separately is an important and accurate note, as these are not bundled with Kubernetes by default.
