# Validation Summary: How to Handle Omap Limitations in Erasure Coded Pools in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (RADOS, erasure coding, omap)
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- CephFS (Ceph Filesystem)
- RBD (RADOS Block Device)
- Kubernetes (CRD definitions)

## Sources Consulted
- Ceph official documentation on erasure coded pools and their limitations (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph documentation on omap and RADOS object data model
- Rook documentation on CephObjectStore CRD (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- Rook documentation on CephFilesystem CRD (https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- Ceph documentation on RGW pool layout and bucket index architecture
- Ceph documentation on CephFS metadata pool requirements
- Linux errno definitions (errno 95 = EOPNOTSUPP)
- Cross-referenced with other Rook CRD examples in the same blog for field name consistency

## Issues Found
- **CephFS omap description was inaccurate**: The post stated CephFS uses omap for "directory entry trees stored in MDS journal." This conflates two separate concepts. CephFS stores directory entries (dentries) as omap key-value pairs on directory fragment objects in the metadata pool. The MDS journal is a separate recovery/replay log and is not the mechanism through which directory entries use omap. Changed to: "directory entries stored as omap on directory fragment objects in the metadata pool."

## Review Notes
- All Rook CRD YAML examples use correct field names and structure, confirmed against other Rook posts in the same blog and Rook documentation.
- The `rados setomapval` command syntax and the expected error code (95 / EOPNOTSUPP) are correct.
- The architectural guidance (replicated pools for omap-heavy workloads, EC pools for bulk data) is accurate and reflects Ceph best practices.
- The `ceph osd pool ls detail` command and output format are correct.
- The note about `allow_ec_overwrites` being required for CephFS data pools on EC is correct, though the post does not show the command to enable it (`ceph osd pool set <pool> allow_ec_overwrites true`). This is acceptable since the Rook CRD handles it automatically.
