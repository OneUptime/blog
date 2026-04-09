# Validation Summary: How to Configure Pool Replicas in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- CephBlockPool CRD
- CRUSH map failure domains

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook GitHub repository CRD docs: https://github.com/rook/rook/blob/master/Documentation/CRDs/Block-Storage/ceph-block-pool-crd.md
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CRUSH map documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found
No technical issues found.

## Review Notes
- The CRD structure is correct: `apiVersion: ceph.rook.io/v1`, `spec.failureDomain` at the spec level (not under `spec.replicated`), `spec.replicated.size` and `spec.replicated.requireSafeReplicaSize` are valid fields.
- The `spec.parameters` map is the correct way to set Ceph pool parameters like `min_size`, `pg_num`, and `pg_autoscale_mode` in Rook. Values must be strings, which the post correctly shows.
- All `ceph osd pool set/get` CLI commands use correct syntax and flags.
- The expected output for `ceph osd pool get replicapool all` is accurate: `crush_rule` displays as a rule name string (not numeric ID) and `object_hash` displays as `rjenkins` at the pool level.
- The 2-replica pool example correctly uses `requireSafeReplicaSize: false` to allow `min_size: 1` with `size: 2`, which would otherwise be blocked by the safe replica size enforcement.
- There is a known Rook GitHub issue (#7073) where `min_size` set via `spec.parameters` was reportedly ignored in some older versions. Users on older Rook versions may need to set `min_size` directly via `ceph osd pool set` commands as a workaround.
