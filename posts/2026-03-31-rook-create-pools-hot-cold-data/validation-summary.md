# Validation Summary: How to Create Separate Pools for Hot and Cold Data in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph OSD device classes (SSD, HDD)
- CephBlockPool (Rook CRD)
- Erasure coding in Ceph
- Kubernetes StorageClasses
- Rook CSI RBD provisioner

## Sources Consulted
- Rook official documentation for CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook official documentation for StorageClass configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph documentation for OSD device classes: https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes
- Ceph documentation for erasure coding with RBD: https://docs.ceph.com/en/latest/rados/operations/erasure-code/#erasure-coding-with-overwrites
- Cross-referenced with other Rook blog posts in this repository for consistent patterns

## Issues Found

### Issue 1: StorageClasses missing required CSI parameters
**What was wrong:** Both the `ceph-hot` and `ceph-cold` StorageClasses were missing essential parameters required by the Rook CSI RBD provisioner: `imageFormat`, `imageFeatures`, and all CSI secret references (`provisioner-secret-name`, `provisioner-secret-namespace`, `controller-expand-secret-name`, `controller-expand-secret-namespace`, `node-stage-secret-name`, `node-stage-secret-namespace`). Without these parameters, volume provisioning would fail at runtime.

**What was changed:** Added `imageFormat: "2"`, `imageFeatures: layering`, and all six CSI secret reference parameters to both StorageClasses, using the standard Rook secret names (`rook-csi-rbd-provisioner` and `rook-csi-rbd-node`).

**Why:** These parameters are required for the Rook CSI driver to authenticate with the Ceph cluster and correctly create RBD images. The Rook documentation and all other blog posts in this repository consistently include them.

### Issue 2: Erasure-coded pool used directly as RBD pool
**What was wrong:** The `ceph-cold` StorageClass set `pool: cold-pool` where `cold-pool` is an erasure-coded pool. RBD (RADOS Block Device) requires a replicated pool for storing image metadata (headers, object map, etc.). An erasure-coded pool cannot serve as the primary pool for RBD.

**What was changed:** Added a new section "Creating a Metadata Pool for the Cold EC Pool" with a small replicated `cold-pool-metadata` CephBlockPool on HDD. Updated the `ceph-cold` StorageClass to use `pool: cold-pool-metadata` (for metadata) and `dataPool: cold-pool` (for the actual data in the EC pool).

**Why:** This is how Ceph and Rook handle erasure-coded block storage — metadata goes to a replicated pool and bulk data goes to the EC pool. Without a replicated metadata pool, RBD image creation would fail.

## Review Notes
- The `compression_mode: "aggressive"` parameter on the cold pool is valid but does not specify a `compression_algorithm`. Ceph defaults to `snappy`; if `zstd` (better compression ratio) is preferred for archival data, the author could add `compression_algorithm: "zstd"` to the cold pool parameters in a future update.
- The post could benefit from mentioning `allowVolumeExpansion: true` on the StorageClasses, which is a common best practice for production use, but this is not a correctness issue.
- The `failureDomain` field is omitted from the CephBlockPool specs; it defaults to `host`, which is correct for most production deployments.
- The advice about data movement between tiers (using rclone/Kubernetes jobs rather than Ceph cache tiering) is accurate — cache tiering has been discouraged by the Ceph community due to complexity and performance edge cases.
