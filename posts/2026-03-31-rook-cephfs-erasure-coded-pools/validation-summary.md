# Validation Summary: How to Configure Erasure Coded Data Pools for CephFS in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- Erasure Coding (jerasure plugin, reed_sol_van technique)
- Kubernetes (CRDs, StorageClass, kubectl)
- Ceph CSI Driver

## Sources Consulted
- Rook official CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook official filesystem-ec.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/filesystem-ec.yaml
- Rook official CephFS StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/cephfs/storageclass.yaml
- Rook source code for EC pool creation: pkg/daemon/ceph/client/pool.go (CreateErasureCodeProfile, createECPoolForApp)
- Rook source code for CephFS EC pool handling: pkg/operator/ceph/file/filesystem.go (allow_ec_overwrites auto-set)
- Ceph documentation on erasure coding: https://docs.ceph.com/en/latest/rados/operations/erasure-code/

## Issues Found

1. **Incorrect: CephBlockPool used for CephFS data pool (removed section)**
   - **What was wrong:** The post included a section "Defining the CephBlockPool for EC Data Pool" that instructed readers to create a `CephBlockPool` resource as a prerequisite for the CephFS EC data pool. `CephBlockPool` is a Rook CRD for RBD (RADOS Block Device) block storage and is not used by the `CephFilesystem` CRD. The CephFilesystem CRD defines its own data pools inline via the `dataPools` field. Creating a CephBlockPool for this purpose would result in an unused, orphaned pool.
   - **What was changed:** Removed the CephBlockPool YAML and apply command. Added a clarifying note that `CephBlockPool` is for RBD block storage and is not needed for CephFS data pools.

2. **Misleading: Manual EC profile creation presented as required**
   - **What was wrong:** The "Creating an Erasure Coding Profile" section stated "Before creating the CephFS, create an EC profile" implying this was a required step. When using the CephFilesystem CRD with `erasureCoded` settings, Rook automatically creates and manages the EC profile.
   - **What was changed:** Updated the introductory text to clarify that Rook auto-creates the EC profile from CRD settings, and manual creation is only needed for custom plugin/technique configurations.

3. **Incorrect summary claim about CephBlockPool**
   - **What was wrong:** The Summary stated "Define the EC pool via CephBlockPool with `erasureCoded` settings, then reference it in the CephFilesystem `dataPools` field." This is incorrect — the EC pool is defined inline in the CephFilesystem CRD, not via a separate CephBlockPool.
   - **What was changed:** Updated to "Define the EC data pool inline in the CephFilesystem CRD's `dataPools` field with `erasureCoded` settings. Rook automatically creates the underlying Ceph pool and EC profile."

## Review Notes
- The `allow_ec_overwrites` flag (required for CephFS to use EC data pools) is automatically set by Rook when creating EC pools for CephFS. The post does not mention this, which is fine since users don't need to set it manually.
- The CephFilesystem CRD example is correct and matches the official Rook `filesystem-ec.yaml` example pattern.
- The StorageClass pool naming convention (`myfs-ec-data` = `<fsName>-<poolName>`) is correct per Rook documentation.
- The CSI secret names (`rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`) match the official Rook examples.
- The erasure coding math (k=4, m=2 = 1.5x overhead vs 3x for triple replication) is correct.
- The "40-50% less raw capacity" claim in the summary is accurate for common EC profiles (e.g., 4+2 = 50% less, 3+2 ≈ 44% less).
