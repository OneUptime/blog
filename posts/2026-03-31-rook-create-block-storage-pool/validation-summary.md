# Validation Summary: How to Create a Rook-Ceph Block Storage Pool

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RADOS Block Device / RBD)
- Kubernetes (PersistentVolumes, StorageClasses, CRDs)
- CRUSH (Controlled Replication Under Scalable Hashing)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph documentation on pool compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Ceph documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph documentation on CRUSH device classes: https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes

## Issues Found

1. **Incorrect comment on `requireSafeReplicaSize`** (line 58): The comment stated "Require all replicas to be written before acknowledging writes." This is inaccurate. `requireSafeReplicaSize: true` enforces a safe `min_size` value (for `size: 3`, it ensures `min_size >= 2`), preventing the pool from accepting I/O with fewer than the safe minimum number of replicas. It does not require all replicas to acknowledge before a write completes. Fixed the comment to accurately describe the behavior.

2. **Incorrect `compression_mode` options comment** (line 118): The comment listed "Options: none, snappy, zlib, zstd, lz4" which conflates compression modes with compression algorithms. The valid `compression_mode` values are `none`, `passive`, `aggressive`, and `force`. The algorithms (`snappy`, `zlib`, `zstd`, `lz4`) are set separately via the `compression_algorithm` parameter. Fixed the comment and added a `compression_algorithm` line to make the distinction clear.

## Review Notes
- The post mentions erasure-coded pools in the description and introduction but only demonstrates replicated pools. This is not an error, but a future revision could add an erasure-coded pool example for completeness.
- The deletion section notes deleting the StorageClass in the prose but does not show the command for it. Not technically incorrect but could be more complete.
- The `allowPoolDeletion` setting must be enabled on the CephCluster CR for pool deletion to work via the operator. The post does not mention this prerequisite, which could cause confusion if a user attempts deletion and it silently fails.
