# Validation Summary: How to Configure size and min_size for Pool Replicas

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- CephBlockPool CRD
- Ceph pool replication parameters (size, min_size)
- Ceph balancer module (read balancing)
- Prometheus (monitoring degraded PGs)
- kubectl

## Sources Consulted
- Ceph Reef documentation — Pools: https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph Quincy documentation — PG States: https://docs.ceph.com/en/quincy/rados/operations/pg-states/
- Ceph documentation — Read Balancer: https://docs.ceph.com/en/reef/rados/operations/read-balancer/
- Ceph documentation — Pool, PG and CRUSH Config Reference: https://docs.ceph.com/en/reef/rados/configuration/pool-pg-config-ref/
- Rook documentation — CephBlockPool CRD
- Rook GitHub Issue #5127 (requireSafeReplicaSize formula discussion)

## Issues Found

1. **"Pool goes read-only" when replicas < min_size (lines 16, 25)**: The post incorrectly stated the pool goes "read-only" when available replicas drop below `min_size`. In reality, the PGs become inactive and **all I/O is blocked** (both reads and writes). Changed to "blocks all I/O" in both locations.

2. **Incorrect `requireSafeReplicaSize` formula (line 45 comment)**: The YAML comment stated `Enforces min_size >= size/2 + 1`. The actual Ceph formula is `min_size >= ceil(size/2)` (equivalently, `size - floor(size/2)`). For odd sizes these produce the same result, but for even sizes (e.g., size=4) they differ: `floor(4/2) + 1 = 3` vs `ceil(4/2) = 2`. Fixed comment to `ceil(size/2)`.

3. **Incorrect default min_size for size=4 (line 91)**: The post claimed `min_size defaults to 3` for size=4. Using the correct formula `ceil(size/2)`, it defaults to 2. Fixed from 3 to 2.

4. **Invalid `read_balance_score` command (line 124)**: The command `ceph osd pool set rbd read_balance_score 1` is invalid — `read_balance_score` is a read-only diagnostic metric, not a settable pool parameter. Replaced with the correct approach using the mgr balancer module: `ceph balancer on` and `ceph balancer mode upmap-read`.

5. **Incorrect read balancing feature attribution (line 120)**: The post referenced a `balance_reads` per-pool option available in "Ceph Quincy+". No such per-pool option exists. Read balancing is managed via the balancer module and was introduced in Ceph Reef+. Fixed the description and version reference. Also removed an irrelevant mention of `nodeep-scrub` in this section.

## Review Notes
- The overall structure and approach of the post is sound and covers an important operational topic.
- The CLI examples for viewing and setting pool parameters via the Rook toolbox pod are correct and follow best practices.
- The Prometheus metric `ceph_pg_degraded` is valid for monitoring degraded PGs.
- The two-node cluster note ("no fault tolerance for OSD failures") is slightly imprecise — with size=2 and min_size=1, a single OSD failure is tolerated, but there is risk of data loss on a subsequent failure. The warning is reasonable for a development-only context.
