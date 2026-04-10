# Validation Summary: How to Configure Data Pool Selection for RBD Mirroring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Ceph RBD Mirroring
- Erasure-coded pools in Ceph
- Rook Ceph Operator for Kubernetes
- Kubernetes StorageClass with Rook CSI

## Sources Consulted
- Ceph official documentation: RBD Mirroring (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph official documentation: Erasure Code (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph official documentation: RBD with Erasure Coded pools (https://docs.ceph.com/en/latest/rados/operations/erasure-code/#erasure-coding-with-overwrites)
- Rook documentation: CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook documentation: Block Storage (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)

## Issues Found
1. **Missing `allow_ec_overwrites` flag for EC pool**: The section "Mirroring Images with Erasure-Coded Data Pools" created an erasure-coded pool but did not set `allow_ec_overwrites true` on it. RBD requires this flag to perform in-place overwrites on erasure-coded pools. Without it, `rbd create` with `--data-pool` pointing to an EC pool will fail. Added `ceph osd pool set ec-data-pool allow_ec_overwrites true` after pool creation.

## Review Notes
- The Rook CephBlockPool CRD with `erasureCoded` spec handles `allow_ec_overwrites` automatically, so the Kubernetes YAML examples were correct as-is.
- The StorageClass example is simplified and omits common parameters like CSI secret references, `imageFormat`, and `imageFeatures`. This is acceptable for a tutorial focused on data pool selection but readers may need additional parameters for a production deployment.
- The `ceph osd lspools` command works but `ceph osd pool ls` is the more modern equivalent. Both are valid.
- The `rbd mirror pool enable <pool> pool` mode mirrors all images in the pool. The Rook CRD example uses `mode: image` which is per-image mirroring. Both are valid approaches but readers should be aware they are different modes. The CLI examples and Rook examples are internally consistent within their own sections.
