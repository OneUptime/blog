# Validation Summary: How to Configure Ceph for Hybrid SSD/HDD Clusters

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph BlueStore (storage backend)
- BlueFS (BlueStore filesystem for RocksDB metadata)
- CRUSH (Controlled Replication Under Scalable Hashing) rules
- RocksDB (BlueStore metadata engine)
- CephBlockPool CRD

## Sources Consulted
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph BlueStore configuration reference (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph CRUSH rule documentation (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph pool operations documentation (https://docs.ceph.com/en/latest/rados/operations/pools/)
- RocksDB tuning options reference

## Issues Found
No technical issues found.

## Review Notes
- The post uses `parameters.crush_rule` in CephBlockPool CRDs to reference manually created CRUSH rules. While this works correctly (Rook passes parameters through to `ceph osd pool set`), an alternative Rook-native approach would be to use `spec.deviceClass: hdd` or `spec.deviceClass: ssd` on the CephBlockPool, which auto-creates the appropriate CRUSH rule. Both approaches are valid; the manual approach gives more explicit control.
- The SSD sizing guidance (1-4% of HDD OSD size) is a reasonable general estimate. Actual usage varies with workload patterns, object sizes, and snapshot/clone usage. Heavy use of snapshots or RBD clones can significantly increase RocksDB metadata size.
- The `bluefs_shared_alloc_size` setting of 65536 (64KB) is reasonable for hybrid setups where BlueFS occasionally spills to the shared HDD device, keeping allocations smaller to reduce wasted space on the slow device.
