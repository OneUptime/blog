# Validation Summary: How to Fix POOL_TOO_FEW_PGS Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph PG Autoscaler
- Ceph Placement Groups (PGs)

## Sources Consulted
- Ceph Health Checks documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Autoscaling Placement Groups (latest): https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Autoscaling Placement Groups (Reef): https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph Pools documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/pools/
- GitHub ceph/ceph placement-groups.rst (main branch): https://github.com/ceph/ceph/blob/main/doc/rados/operations/placement-groups.rst
- Ceph PG Autoscaler Tuning Blog (2022): https://ceph.io/en/news/blog/2022/autoscaler_tuning/

## Issues Found

1. **Autoscale-status output column names were inaccurate.** The example output used underscore-separated column names (`TARGET_SIZE`, `RAW_CAPACITY`, `TARGET_SIZE_RATIO`, `NEW_PG_NUM`) whereas the real Ceph output uses space-separated names (`TARGET SIZE`, `RAW CAPACITY`, `TARGET RATIO`, `NEW PG_NUM`). The real output also includes `EFFECTIVE RATIO`, `AUTOSCALE`, and `BULK` columns that were missing. Fixed the example output to match the actual Ceph CLI format.

2. **Missing note about `pgp_num` being auto-adjusted in modern Ceph.** The post instructed users to manually set `pgp_num` after changing `pg_num`. Since Ceph Nautilus (14.x), `pgp_num` is automatically and incrementally adjusted to match `pg_num`. Added a note clarifying this step is only needed for pre-Nautilus releases.

## Review Notes
- All CLI commands (`ceph health detail`, `ceph osd pool set`, `ceph osd pool get`, `ceph osd df`, `ceph pg stat`) are syntactically correct and valid.
- The distinction between `POOL_TOO_FEW_PGS` (per-pool, autoscaler-driven) and `TOO_FEW_PGS` (cluster-wide, OSD-count-based) is accurately described.
- `target_size_bytes` and `target_size_ratio` are both valid pool properties for the autoscaler. Note that if both are set on the same pool, `target_size_ratio` takes precedence and `target_size_bytes` is ignored -- the post does not mention this but it is not incorrect as presented.
- The `POOL_TOO_FEW_PGS` warning only fires when `pg_autoscale_mode` is set to `warn`, not `on` (since `on` would auto-fix it). The post does not explicitly state this but does not claim otherwise.
