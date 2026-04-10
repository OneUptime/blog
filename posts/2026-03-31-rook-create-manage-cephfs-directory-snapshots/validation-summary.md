# Validation Summary: How to Create and Manage CephFS Directory Snapshots

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- CephFS (Ceph Filesystem)
- Ceph MDS (Metadata Server)
- Ceph Manager snap_schedule module
- Kubernetes CSI Volume Snapshots (snapshot.storage.k8s.io/v1)
- Rook CephFS CSI Driver

## Sources Consulted
- Ceph official documentation on CephFS snapshots (https://docs.ceph.com/en/latest/cephfs/snap-schedule/)
- Ceph official documentation on CephFS mount syntax (https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/)
- Rook documentation on CephFS VolumeSnapshotClass (https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/)
- Rook GitHub repository snapshot class examples (rook/deploy/examples/csi/cephfs/snapshotclass.yaml)
- Kubernetes VolumeSnapshot API reference (https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- Other validated blog posts in this repository covering CephFS snapshots and VolumeSnapshotClass configuration

## Issues Found
1. **VolumeSnapshotClass had incorrect parameters**: The `parameters` section contained `csi.storage.k8s.io/volumesnapshot/name`, `csi.storage.k8s.io/volumesnapshot/namespace`, and `csi.storage.k8s.io/volumesnapshotcontent/name` — these are not standard parameters for the Rook CephFS CSI driver and would not enable proper authentication for snapshot operations. Replaced with the correct parameters: `csi.storage.k8s.io/snapshotter-secret-name: rook-csi-cephfs-provisioner` and `csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph`, which are required for the CSI driver to authenticate with Ceph when creating snapshots.

## Review Notes
- The `mount -t ceph mon1:6789:/ ...` command uses the legacy kernel mount syntax. Newer Ceph versions (Pacific+) recommend the new-style mount syntax (`mount -t ceph <name>@<fsid>.<fs_name>=/ /mnt/cephfs`), but the legacy syntax still works and is not incorrect.
- The prerequisite mentions Ceph 15.2+ (Octopus) for stable snapshot support. CephFS snapshots were re-enabled in Nautilus (14.2) and progressively stabilized through Octopus and Pacific. The Octopus recommendation is reasonable.
- In older Ceph versions (pre-Pacific), snapshots must be explicitly enabled with `ceph fs set <fs_name> allow_new_snaps true`. The post does not mention this, which could cause confusion for users on Octopus. In Pacific+ this is enabled by default.
- The `ceph fs snap-schedule` commands, manual `.snap` directory operations, CephFilesystem CR, and VolumeSnapshot resource are all technically correct.
