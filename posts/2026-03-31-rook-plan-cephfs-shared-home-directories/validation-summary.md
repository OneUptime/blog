# Validation Summary: How to Plan CephFS for Shared Home Directories

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- Ceph MDS (Metadata Server)
- CephFS subvolumes and subvolume groups
- Kubernetes StorageClass and PersistentVolumeClaim
- Rook CephFS CSI driver

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFS StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Ceph CephFS subvolume documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- CephFS kernel client mount options: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/

## Issues Found
1. **Invalid `discard` mount option in StorageClass**: The StorageClass definition included `mountOptions: - discard`. The `discard` mount option is used with block-device filesystems (e.g., ext4/xfs on RBD volumes) to pass TRIM/UNMAP operations to the underlying storage. CephFS is a network filesystem and does not support the `discard` mount option — it is not recognized by the CephFS kernel client or ceph-fuse. Removed the `mountOptions` block from the StorageClass.

## Review Notes
- The `ceph mds stat` command shown in the monitoring section still works but provides less detail than `ceph fs status`. Both are valid.
- The MDS sizing guidance (4 GB per MDS for 500 users) is reasonable but workload-dependent. For metadata-heavy workloads (many small files), more memory may be needed.
- The subvolume `--size` values are correctly specified in bytes (10737418240 = 10 GiB, 5368709120 = 5 GiB).
- All Rook CRD fields in the CephFilesystem YAML are correct for current Rook versions.
- The CSI secret names (`rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`) match the defaults created by Rook.
