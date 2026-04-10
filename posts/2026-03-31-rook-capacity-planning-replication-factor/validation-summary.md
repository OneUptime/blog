# Validation Summary: How to Plan Capacity with Replication Factor

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph replication (pool size, min_size)
- CephBlockPool CRD (ceph.rook.io/v1)
- kubectl (Kubernetes CLI)
- bc (arbitrary precision calculator)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph documentation on pool replication: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph OSD pool set command reference: https://docs.ceph.com/en/latest/rados/operations/pools/#set-pool-values
- Ceph monitoring commands (ceph health detail, ceph pg stat): https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found
No technical issues found.

## Review Notes
- The replication factor table correctly shows usable capacity as 1/N of raw and fault tolerance as N-1 failures.
- All capacity calculations are mathematically correct, including the 80% utilization threshold (dividing by 0.80).
- The Rook CephBlockPool YAML uses correct apiVersion (ceph.rook.io/v1), valid field names (size, requireSafeReplicaSize, replicasPerFailureDomain, deviceClass), and proper nesting.
- The `deviceClass` field is correctly placed at `spec.deviceClass` (top-level PoolSpec field, not under `spec.replicated`).
- The Step 4 mixed pool examples omit the `namespace` field that was present in Step 3, which is fine for brevity in subsequent examples.
- The `requireSafeReplicaSize: false` setting for 2-replica test/dev pools is correctly flagged as weaker durability — this allows writes to proceed even when fewer than min_size replicas are available.
- All Ceph CLI commands (`ceph osd dump`, `ceph osd pool set`, `ceph health detail`, `ceph pg stat`) are valid and use correct syntax.
