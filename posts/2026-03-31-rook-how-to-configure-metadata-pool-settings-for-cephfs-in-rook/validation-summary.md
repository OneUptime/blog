# Validation Summary: How to Configure Metadata Pool Settings for CephFS in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- CephFilesystem CRD (ceph.rook.io/v1)
- Ceph MDS (Metadata Server)
- CRUSH rules and device classes
- Kubernetes placement and resource configuration

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph CephFS documentation: https://docs.ceph.com/en/latest/cephfs/
- Ceph erasure coding documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph pool configuration documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found

### Issue 1: Incorrect claim that erasure coding is possible for metadata pools
- **What was wrong:** The post stated "While erasure coding is possible for the metadata pool, it is generally not recommended." CephFS does not support erasure-coded metadata pools. Ceph explicitly requires the metadata pool to be a replicated pool and will reject an EC pool.
- **What was changed:** Corrected the section heading from "Not Recommended" to "Not Supported" and rewrote the explanation to clarify that EC is not supported (not merely not recommended). Added the correct technical reasons: metadata requires partial overwrites (unsupported by EC pools) and omap operations (only available on replicated pools).

### Issue 2: Incorrect description of `min_size` parameter
- **What was wrong:** The comment for the `min_size` pool parameter said "Min object size for write-back caching." This is incorrect. The `min_size` pool parameter controls the minimum number of replicas that must be available for the pool to accept I/O operations when degraded.
- **What was changed:** Corrected the comment to "Minimum number of replicas required for I/O on a degraded pool."

### Issue 3: Inconsistent pool naming in toolbox commands
- **What was wrong:** The CephFilesystem CRD uses `name: myfs`, but the toolbox commands referenced `ceph-filesystem-metadata` as the pool name. Rook names the metadata pool `<filesystem-name>-metadata`, so for a filesystem named `myfs`, the pool would be `myfs-metadata`.
- **What was changed:** Replaced all occurrences of `ceph-filesystem-metadata` with `myfs-metadata` to be consistent with the CRD definition.

## Review Notes
- The `ceph mds stat` command is used in the health check section. While still functional, `ceph fs status` (also shown) is the more modern and preferred command for checking filesystem and MDS status.
- The `ceph fs check` command referenced in the "Expanding Metadata Pool Capacity" section is not a widely documented command. Users may want to use `ceph fs status` or MDS scrub operations instead for verifying metadata integrity.
- The MDS resource limits shown (4Gi request, 8Gi limit for memory) are reasonable defaults. For very large filesystems, MDS cache can be tuned via `mds_cache_memory_limit` which the post does not cover, but the summary correctly notes that larger filesystems need more MDS memory.
