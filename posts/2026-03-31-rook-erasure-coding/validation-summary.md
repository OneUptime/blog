# Validation Summary: How to Use Erasure Coding in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes
- Erasure coding (jerasure plugin, reed_sol_van technique)
- CephBlockPool, CephObjectStore, CephFilesystem CRDs
- RBD (RADOS Block Device)
- CephFS
- RGW (RADOS Gateway / S3-compatible object storage)

## Sources Consulted
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook CephObjectStore CRD documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- Rook CephFilesystem CRD documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/)
- Ceph erasure code documentation (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph erasure code profile documentation (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Ceph erasure code jerasure plugin documentation (https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/)

## Issues Found

### Issue 1: Deprecated `ruleset-failure-domain` parameter
- **What was wrong:** The custom EC profile command used `ruleset-failure-domain=host`, which was the parameter name in Ceph Jewel (10.x) and earlier.
- **What was changed:** Replaced with `crush-failure-domain=host`, which is the correct parameter name since Ceph Luminous (12.x) and all current stable releases (Reef, Squid).
- **Why:** Using the deprecated parameter name would cause errors or warnings on any modern Ceph cluster.

### Issue 2: Inaccurate OSD recovery description
- **What was wrong:** The limitations section stated "OSD recovery after failure requires reading from all surviving shards," implying all remaining shards must be read.
- **What was changed:** Corrected to "OSD recovery after failure requires reading from at least k surviving shards."
- **Why:** Ceph recovery only needs to read k shards (the minimum number of data chunks) to reconstruct a missing shard, not all surviving shards. For EC 4+2 with one failed OSD, only 4 of the 5 surviving shards need to be read.

## Review Notes
- The EC overhead calculations in the table are all mathematically correct using the standard formula (k+m)/k.
- All Rook CRD YAML examples (CephBlockPool, CephObjectStore, CephFilesystem) use correct field names and structure for the `ceph.rook.io/v1` API version.
- The default EC profile values (`plugin=jerasure`, `technique=reed_sol_van`) are correct for current stable Ceph releases (Reef, Squid). Note: the Ceph Tentacle development branch has changed the default plugin to `isa` (Intel Storage Acceleration), which may affect future releases.
- The claim "EC pools cannot be used for Ceph monitor data" is technically correct — Ceph monitors use their own internal RocksDB store replicated via Paxos, not RADOS pools. The phrasing could be slightly misleading (implying monitors use replicated pools instead), but is not wrong.
- The `preservePoolsOnDelete` field in the CephObjectStore example is a valid and documented field.
- The `compression_mode: "passive"` parameter in the CephBlockPool example is correct and well-documented.
