# Validation Summary: How to Configure pg_num_min and pg_num_max Bounds in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (PG autoscaler, OSD pool configuration)
- Rook (CephBlockPool CRD)
- Kubernetes (kubectl exec)

## Sources Consulted
- [Ceph documentation — Placement Groups](https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- [Ceph documentation — Pool operations (ceph osd pool set/get)](https://docs.ceph.com/en/latest/rados/operations/pools/)
- [Ceph documentation — PG Autoscaler](https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups)
- [Rook documentation — CephBlockPool CRD](https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)

## Issues Found
1. **Incorrect value for clearing `pg_num_min`**: The "Clearing Bounds" section instructed users to set `pg_num_min` to `1` to remove the lower bound. The correct value is `0`, which means "no minimum constraint." While `1` is functionally almost the same (a pool must have at least 1 PG), it does not actually clear the setting — it sets an explicit floor of 1. Changed `pg_num_min 1` to `pg_num_min 0` and updated the explanation to clarify that setting `pg_num_min` to 0 removes the lower bound.

## Review Notes
- All `ceph osd pool set/get` command syntax is correct for Ceph Nautilus (14.x) and later.
- The `ceph osd pool autoscale-status` command is correct.
- The Rook CephBlockPool CRD YAML uses the correct API version (`ceph.rook.io/v1`), and the `parameters` map with string values is the correct way to pass pool-level settings through Rook.
- The recommended PG bounds (e.g., 64–512 for a 12-OSD RBD pool, 16–64 for a CephFS metadata pool) are reasonable and align with common Ceph sizing guidance, though optimal values depend on cluster size and workload.
- PG counts should be powers of 2 for optimal CRUSH distribution; all values used in the post (16, 32, 64, 256, 512) satisfy this requirement.
