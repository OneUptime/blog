# Validation Summary: How to Configure RADOS Object Replica Management

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- RADOS (Reliable Autonomic Distributed Object Store)
- CephBlockPool CRD
- kubectl / Ceph CLI

## Sources Consulted
- [Rook CephBlockPool CRD Documentation](https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/)
- [Ceph RADOS Pools Operations](https://docs.ceph.com/en/latest/rados/operations/pools/)
- [Ceph Pool, PG and CRUSH Config Reference](https://docs.ceph.com/en/latest/rados/configuration/pool-pg-config-ref/)

## Issues Found

**`requireSafeReplicaSize` table description was incorrect.**

- **What was wrong:** The table described `requireSafeReplicaSize` as "Block I/O if `size` < min_size". This is doubly wrong: (1) `requireSafeReplicaSize` is a pool-creation guard that prevents setting `size: 1`, not an I/O blocker; and (2) the condition `size < min_size` cannot occur because `size` must always be ≥ `min_size`.
- **What was changed:** Updated the description to "Prevent creating pools with `size: 1` (single replica, guaranteed data loss)", which matches the official Rook documentation.
- **Why:** Per official Rook docs, `requireSafeReplicaSize: true` (the default) blocks creation of single-replica pools (`size: 1`). Setting it to `false` explicitly acknowledges the data loss risk of a single-replica setup. It has no effect on I/O once a pool is running.

## Review Notes
- The inline prose explanation ("prevents you from accidentally setting `size` to 1") is correct and consistent with official Rook documentation — no change needed there.
- The `min_size` placement under `spec.parameters` (rather than `spec.replicated`) is correct per the Rook CRD spec.
- The `ceph osd dump | grep "^pool" | awk '{print $3, "size:", $6}'` command is correct: pool lines in `ceph osd dump` follow the format `pool <ID> '<name>' replicated size <N> ...`, making $3 the pool name and $6 the size value.
- The `ceph osd pool ls detail --format json-pretty` JSON parsing (fields `pool_name`, `size`, `min_size`) matches the Ceph output schema.
- The `size=3, min_size=2` production recommendation is accurate: losing one OSD keeps the pool writable; losing two halts writes.
