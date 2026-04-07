# Validation Summary: How to Size a Ceph Cluster for Block Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Kubernetes PersistentVolumes / StorageClass
- BlueStore (Ceph OSD backend)
- Ceph CSI driver (rook-ceph.rbd.csi.ceph.com)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/
- Ceph erasure coding with RBD: https://docs.ceph.com/en/latest/rados/operations/erasure-code/#erasure-coding-with-overwrites
- Ceph BlueStore compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Rook StorageClass examples: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found

1. **Incorrect claim that EC is not supported for RBD**: The post stated "RBD pools always use replication (not EC) because RBD requires the layering feature" and repeated "EC is not supported for RBD" in the summary. This is factually incorrect — Ceph has supported RBD on erasure-coded pools since Luminous (v12.2) using the `allow_ec_overwrites` flag. Updated both the section text and summary to clarify that replication is *recommended* (not required) for latency-sensitive RBD workloads.

2. **Deprecated `storeType: bluestore` config**: The `storeType` option under `storage.config` in the CephCluster CRD is deprecated. BlueStore has been the only supported OSD backend since Ceph Nautilus. Replaced with `osdsPerDevice: "1"`, which is a more useful and current configuration option.

3. **Missing toolbox context for `rbd du` command**: The thin provisioning section showed `rbd du` as a bare command, while all other Ceph CLI commands in the post were correctly wrapped in `kubectl exec` against the toolbox deployment. Added the `kubectl exec` wrapper for consistency and correctness.

## Review Notes
- The capacity calculations (raw * 3 * 1.2) are reasonable. The 1.2 overhead factor accounts for Ceph internal overhead (BlueStore metadata, WAL, etc.), which is a common planning heuristic.
- The StorageClass configuration is correct and follows current Rook CSI best practices, including `imageFormat: "2"` and `volumeBindingMode: WaitForFirstConsumer`.
- The compression parameters (`compression_mode` and `compression_algorithm`) are valid pool-level properties that BlueStore respects.
- The HDD IOPS figure of "200 IOPS" is a reasonable ballpark for 7200 RPM spinning disks doing random I/O.
