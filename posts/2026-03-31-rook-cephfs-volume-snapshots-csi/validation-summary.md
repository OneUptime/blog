# Validation Summary: How to Create CephFS Volume Snapshots with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (1.9+)
- Ceph / CephFS
- Kubernetes (1.20+)
- CSI Volume Snapshots (snapshot.storage.k8s.io/v1)
- VolumeSnapshotClass / VolumeSnapshot API

## Sources Consulted
- Rook official documentation on CephFS volume snapshots: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Ceph documentation on fs subvolume snapshot commands: https://docs.ceph.com/en/latest/cephfs/fs-volumes/#subvolume-snapshot-management

## Issues Found
1. **Incorrect `ceph fs subvolume snapshot ls` command syntax**: The command had an extra positional argument `csi` between the volume name and subvolume name. The original was `ceph fs subvolume snapshot ls myfs csi <subvolume-name> --group_name csi`. The correct syntax is `ceph fs subvolume snapshot ls <vol_name> <sub_name> [--group_name <group_name>]`, so the fix removes the erroneous `csi` positional argument: `ceph fs subvolume snapshot ls myfs <subvolume-name> --group_name csi`.

## Review Notes
- The VolumeSnapshotClass YAML correctly uses `driver` (not the older `snapshotter` field from the v1beta1 API), which is appropriate for `snapshot.storage.k8s.io/v1`.
- The CSI driver name `rook-ceph.cephfs.csi.ceph.com` and secret name `rook-csi-cephfs-provisioner` match the Rook defaults.
- The post correctly notes that CephFS snapshots are at the subvolume level and that in-flight writes may not be captured — an important caveat for production use.
- The restore PVC correctly uses `dataSource` with `apiGroup: snapshot.storage.k8s.io` and `kind: VolumeSnapshot`.
- Kubernetes 1.20 is correct as the minimum for GA VolumeSnapshot support (v1 API).
