# Validation Summary: How to Understand Ceph Pools and Logical Partitions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (RADOS, pools, CRUSH, erasure coding, replication)
- Rook (CephBlockPool CRD, toolbox)
- Kubernetes (kubectl)

## Sources Consulted
- Rook official documentation: CephBlockPool CRD spec (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook toolbox documentation (https://rook.io/docs/rook/latest/Troubleshooting/direct-tools/)
- Ceph official documentation: Pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph official documentation: Erasure coding (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)

## Issues Found
1. **Toolbox kubectl exec command**: The original command was `kubectl exec -it rook-ceph-tools -n rook-ceph -- bash`. The Rook toolbox is deployed as a Kubernetes Deployment named `rook-ceph-tools`, so the actual pod name includes a random suffix (e.g., `rook-ceph-tools-6bc7c4f7b-x9hk2`). Using the bare name `rook-ceph-tools` as a pod reference would fail. Fixed to `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash`, which correctly targets the Deployment resource and lets kubectl find the underlying pod automatically. This matches the Rook official documentation.

## Review Notes
- The erasure coding overhead calculation (1.5x for 4+2 vs 3x for 3-replica) is correct: 6 total chunks / 4 data chunks = 1.5x.
- The Rook CRD YAML examples use correct `ceph.rook.io/v1` API version and valid field names (`replicated.size`, `requireSafeReplicaSize`, `erasureCoded.dataChunks`, `erasureCoded.codingChunks`, `failureDomain`).
- All `ceph osd pool` CLI commands (`lspools`, `ls detail`, `get`, `set-quota`, `get-quota`, `set`, `application enable`) use correct syntax and valid parameters.
- The pool-to-service mapping table (RBD, CephFS metadata/data, RGW) is accurate.
- The claim that Ceph emits a health warning for pools without application labels is correct (POOL_APP_NOT_ENABLED warning).
