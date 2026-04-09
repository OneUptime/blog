# Validation Summary: How to Design a Pool Strategy for Mixed Workloads in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes StorageClasses
- Ceph Block Storage (RBD) with CSI
- Ceph Erasure Coding
- CRUSH rules and device class isolation
- PG autoscaling

## Sources Consulted
- Rook Block Storage Documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CephBlockPool CRD reference: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook EC StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass-ec.yaml
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph BlueStore compression reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph Placement Groups / Autoscaling: https://docs.ceph.com/en/reef/rados/operations/placement-groups/

## Issues Found

### 1. Missing replicated metadata pool and `dataPool` parameter for erasure-coded RBD StorageClass

**What was wrong:** The backup-pool StorageClass referenced the erasure-coded pool directly via `pool: backup-pool`. RBD (RADOS Block Device) requires a replicated pool for storing image metadata (headers, snapshots, etc.) even when data is stored on an erasure-coded pool. Without a replicated metadata pool and the `dataPool` parameter, RBD provisioning over the EC pool would fail.

**What was changed:**
1. Added a replicated `CephBlockPool` named `backup-pool-metadata` (replicated 3x on HDD) to serve as the metadata pool for the EC backup pool.
2. Updated the backup StorageClass to use `pool: backup-pool-metadata` (replicated metadata pool) and added `dataPool: backup-pool` (the EC data pool).
3. Added a brief explanatory sentence noting that RBD requires a replicated metadata pool alongside the EC data pool.

**Why:** This matches the pattern shown in Rook's official `storageclass-ec.yaml` example, which requires both `pool` and `dataPool` parameters for EC-backed RBD.

## Review Notes
- The `pg_num: "128"` set manually in the db-pool parameters is somewhat redundant given that the post later enables `pg_autoscale_mode on`, which will adjust PG counts automatically. This is not incorrect (it sets an initial value), but readers should be aware that the autoscaler may override this value.
- The CRUSH rule commands in the "Applying CRUSH Rules" section are technically redundant when `deviceClass` is already set in the CephBlockPool CRD spec, as Rook automatically creates the appropriate CRUSH rules. The commands are valid Ceph commands and useful for understanding CRUSH internals, but are not strictly necessary when using the Rook CRD.
- The StorageClass examples omit CSI secret parameters (`csi.storage.k8s.io/provisioner-secret-name`, etc.) which are required in practice. This is an acceptable simplification for a blog post focused on pool strategy, but readers should consult the full Rook StorageClass examples for production use.
