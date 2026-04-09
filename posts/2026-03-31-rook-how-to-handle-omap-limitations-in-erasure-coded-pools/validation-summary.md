# Validation Summary: How to Handle Omap Limitations in Erasure Coded Pools

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (RADOS, OSD, erasure coding)
- Rook (Ceph operator for Kubernetes)
- RGW (RADOS Gateway / Ceph Object Storage)
- CephFS (Ceph Filesystem)
- RBD (RADOS Block Device)
- OMAP (per-object key-value store in RADOS)

## Sources Consulted
- Ceph official documentation on erasure coded pools: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph official documentation on pool operations (`ceph osd pool create`): https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph RGW placement and zone configuration: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph CephFS documentation on EC data pools: https://docs.ceph.com/en/latest/cephfs/createfs/
- Ceph RADOS CLI reference (`rados setomapval`): https://docs.ceph.com/en/latest/man/8/rados/
- Ceph erasure code profiles (jerasure plugin, techniques): https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/

## Issues Found
No technical issues found.

## Review Notes
- The `ceph osd pool create` commands explicitly specify pgp_num (the second numeric argument). In Ceph Nautilus and later, pgp_num automatically tracks pg_num, making the explicit value redundant but not incorrect. This is fine for clarity.
- The post correctly notes the "(some)" qualifier for RADOS class method support on EC pools — read-only class methods are supported, while write-capable ones are not.
- The `allow_ec_overwrites` flag for CephFS data pools on EC is correctly included and is a required step that is sometimes overlooked.
- The post title mentions "Rook" but the content is entirely about Ceph internals rather than Rook-specific configuration (CephBlockPool or CephFilesystem CRDs). This is acceptable since Rook users need to understand these Ceph-level constraints, but a future revision could add Rook CRD examples.
