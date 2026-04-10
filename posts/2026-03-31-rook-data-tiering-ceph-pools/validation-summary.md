# Validation Summary: How to Set Up Data Tiering with Ceph Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system) - device classes, CRUSH maps, pools, erasure coding, compression
- Kubernetes - StorageClass, PersistentVolumeClaim, CSI
- Ceph CSI RBD provisioner
- PromQL / Ceph Prometheus metrics

## Sources Consulted
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph OSD device class documentation (https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes)
- Ceph `osd crush set-device-class` and `osd crush rm-device-class` CLI reference (https://docs.ceph.com/en/latest/man/8/ceph/#osd)
- Ceph pool compression_mode parameter documentation (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression)
- Kubernetes StorageClass and PVC API reference (https://kubernetes.io/docs/concepts/storage/storage-classes/)
- Rook CSI RBD StorageClass examples (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)

## Issues Found
1. **Missing `rm-device-class` step when correcting auto-detected classes**: The post instructed readers to use `ceph osd crush set-device-class` to fix incorrect auto-detection, but this command fails with `Error EBUSY` if the OSD already has a device class assigned (which it would if auto-detection ran). Added the required `ceph osd crush rm-device-class` command before the `set-device-class` command, with a clarifying comment.

## Review Notes
- The post creates three tier pools (hot/warm/cold) but only shows StorageClasses for the hot and warm tiers. The cold tier (erasure-coded HDD pool) would require a StorageClass with a `dataPool` parameter pointing to the erasure-coded pool and a `pool` parameter pointing to a replicated metadata pool. This is not a technical error in the existing content, but readers wanting to use the cold tier for RBD volumes would need additional configuration not covered here.
- All CephBlockPool CRD fields (`deviceClass`, `replicated`, `erasureCoded`, `parameters`) are valid for the current Rook `ceph.rook.io/v1` API version.
- The `compression_mode` values used (none, passive, aggressive) are all valid Ceph BlueStore compression modes.
- The PromQL metric `ceph_pool_bytes_used` with `name` label filtering is correct for Ceph MGR Prometheus module exports.
