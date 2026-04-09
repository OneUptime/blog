# Validation Summary: How to Fix CephFS Volume Snapshots Not Ready After Rook Upgrades

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- CephFS (Ceph File System)
- Kubernetes VolumeSnapshot API (snapshot.storage.k8s.io/v1)
- CSI (Container Storage Interface) external-snapshotter
- kubectl CLI

## Sources Consulted
- Rook CephFS VolumeSnapshotClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/cephfs/snapshotclass.yaml
- Rook CSI Snapshot documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Rook CSI Drivers documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Ceph FS Volumes and Subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- kubernetes-csi/external-snapshotter GitHub releases and CRD files (v8.0.0 tag verified)

## Issues Found
- **Step 5 - Incorrect `ceph fs subvolume snapshot ls` syntax**: The command used `<group>` as a bare positional third argument (`ceph fs subvolume snapshot ls myfs <subvolume> <group>`). According to the official Ceph documentation, the group name must be passed as a named flag: `--group_name <group>`. Fixed to `ceph fs subvolume snapshot ls myfs <subvolume> --group_name <group>`.

## Review Notes
- The VolumeSnapshotClass YAML matches the official Rook example at `deploy/examples/csi/cephfs/snapshotclass.yaml` exactly, including driver name (`rook-ceph.cephfs.csi.ceph.com`), secret names, and class name.
- The external-snapshotter CRD URLs at v8.0.0 were verified to be valid and accessible. Note that newer versions (up to v8.5.0) are available; users may want to use the latest version matching their CSI driver.
- The snapshot controller namespace (`kube-system`) is a common default but may differ depending on the cluster setup. The post could note this caveat but it is not incorrect.
- The driver name `rook-ceph.cephfs.csi.ceph.com` assumes the default operator namespace `rook-ceph`. If installed in a different namespace, the prefix changes accordingly.
