# Validation Summary: How to Configure Erasure Coded Block Storage Pools in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (erasure coding, RBD, OSD management)
- Kubernetes (CRDs, StorageClass, kubectl)
- CephBlockPool CRD (ceph.rook.io/v1)
- CSI RBD provisioner (rook-ceph.rbd.csi.ceph.com)

## Sources Consulted
- Rook official documentation on CephBlockPool CRD and erasure-coded pools: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Storage Configuration documentation for EC StorageClass: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph documentation on erasure code profiles: https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/
- Ceph documentation on RBD with erasure-coded pools: https://docs.ceph.com/en/latest/rbd/rbd-erasure-code/
- Linux kernel RBD EC support history (kernel changelogs for v4.11+)

## Issues Found
1. **StorageClass `pool` and `dataPool` parameters were incorrect (lines 59-80):**
   - **What was wrong:** The StorageClass set `pool: ec-block-pool` (the EC data pool) and omitted the `dataPool` parameter entirely. For RBD with erasure-coded pools, RBD metadata must reside in a replicated pool. The `pool` parameter must point to the replicated metadata pool, and `dataPool` must point to the EC pool. The descriptive text mentioned `dataPool` but the YAML did not include it, creating a contradiction.
   - **What was changed:** Set `pool: ec-block-pool-metadata` and added `dataPool: ec-block-pool`. Also updated the descriptive text to accurately explain the role of each parameter.
   - **Why:** Without this fix, the StorageClass would attempt to use the EC pool for RBD metadata, which would fail because RBD metadata requires a replicated pool. This is documented in both Rook and Ceph official documentation.

## Review Notes
- The erasure coding math (overhead ratios, failure tolerances, minimum host counts) is all correct.
- The kernel version requirement (v4.11+) for EC RBD support is accurate.
- The CephBlockPool CRD YAML uses the correct API version and field names for Rook.
- The `fast_read` pool parameter is a valid Ceph pool setting.
- The manual EC profile creation via the toolbox is an alternative to letting Rook manage it; the post correctly shows both the manual CLI approach and the CRD-based approach.
- The post correctly notes that Rook auto-creates the metadata pool named `<pool-name>-metadata`.
