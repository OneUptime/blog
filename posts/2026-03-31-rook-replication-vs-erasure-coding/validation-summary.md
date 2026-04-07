# Validation Summary: How to Choose Between Replication and Erasure Coding for Pools

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (replicated and erasure coded pools)
- CephBlockPool CRD (`ceph.rook.io/v1`)
- Ceph RBD (RADOS Block Device)
- Kubernetes StorageClass parameters for Rook CSI

## Sources Consulted
- Rook CephBlockPool CRD source (`pkg/apis/ceph.rook.io/v1/types.go`) — confirmed `erasureCoded.dataChunks` and `erasureCoded.codingChunks` field names
- Rook official example `deploy/examples/pool-ec.yaml` — confirmed EC pool YAML structure
- Rook official example `deploy/examples/csi/rbd/storageclass-ec.yaml` — confirmed StorageClass `pool` (replicated metadata) and `dataPool` (EC data) parameter semantics
- Ceph documentation on erasure coding profiles and overhead calculations

## Issues Found
1. **StorageClass parameters for EC+RBD were incorrect.** The snippet set both `pool: ec-pool` and `dataPool: ec-pool`, which is wrong. Per Rook documentation, `pool` must reference the replicated metadata pool and `dataPool` must reference the erasure coded data pool. RBD metadata cannot be stored in an EC pool. Fixed by changing `pool` to `replicapool` (the replicated pool defined earlier in the post) and updating the inline comment for clarity.

## Review Notes
- The erasure coding overhead calculations in the table are all correct (e.g., k=8,m=3 gives (8+3)/8 = 1.375x).
- The CephBlockPool YAML examples use correct apiVersion (`ceph.rook.io/v1`) and valid field names.
- The replicated pool YAML correctly includes `requireSafeReplicaSize: true`.
- The post correctly notes that EC pools for RBD require a replicated metadata pool, but the original code example contradicted this statement.
