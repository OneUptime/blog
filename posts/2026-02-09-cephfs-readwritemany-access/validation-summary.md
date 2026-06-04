# Validation Summary: How to Configure CephFS Shared File System for ReadWriteMany Access Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CephFS
- Ceph RBD
- Rook-Ceph
- Kubernetes PersistentVolumeClaims and StorageClasses
- Ceph CSI
- Kubernetes VolumeSnapshots
- Prometheus metrics

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFS filesystem storage documentation: https://rook.github.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephFilesystemSubVolumeGroup CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-fs-subvolumegroup-crd/
- Rook Ceph CSI snapshot documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Rook Ceph CSI drivers documentation: https://rook.io/docs/rook/v1.13/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- CephFS quotas documentation: https://docs.ceph.com/en/squid/cephfs/quota/
- CephFS volumes and subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Ceph monitoring documentation: https://docs.ceph.com/en/latest/monitoring/
- Ceph-CSI CephFS StorageClass example: https://github.com/ceph/ceph-csi/blob/devel/examples/cephfs/storageclass.yaml

## Issues Found
- The introduction said Ceph RBD only supports ReadWriteOnce. Updated this to say typical filesystem-backed RBD volumes are optimized for ReadWriteOnce pod access, because Ceph/Rook document RBD primarily as the RWO block driver while raw block mode has broader access-mode support.
- The quota examples used invalid `ceph fs set max_bytes` and `ceph fs set max_files` commands. Replaced them with the documented CephFS quota extended attributes, `ceph.quota.max_bytes` and `ceph.quota.max_files`, using `setfattr` and `getfattr`.
- The StorageClass subvolume group parameter was misspelled as `subvolumGroup`. Corrected it to the Ceph-CSI parameter name `subvolumeGroup`.
- The Prometheus examples used outdated or incorrect metric names, including `ceph_pool_used_bytes` and `ceph_mds_sessions`. Updated them to current Ceph metric names such as `ceph_pool_bytes_used`, `ceph_pool_metadata`, and `ceph_mds_sessions_session_count`.
- The troubleshooting section had a typo in the comment `Check for degraded MDSsudo`. Corrected it to `Check for degraded MDS`.

## Review Notes
The core Rook CephFilesystem, CephFS StorageClass, PVC, Deployment, VolumeSnapshotClass, and CephFS subvolume snapshot examples are consistent with current Rook/Ceph documentation. The performance-tuning values are workload-dependent; in particular, reducing replication size should be treated as a durability tradeoff rather than a universal recommendation.
