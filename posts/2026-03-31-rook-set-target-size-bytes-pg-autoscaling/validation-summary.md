# Validation Summary: How to Set target_size_bytes for PG Autoscaling in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (PG autoscaler, OSD pool management)
- Rook (CephBlockPool CRD, rook-ceph-tools deployment)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official documentation on PG autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Ceph documentation on pool settings (`target_size_bytes`, `target_size_ratio`): https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook documentation on CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph health checks documentation (POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO): https://docs.ceph.com/en/latest/rados/operations/health-checks/

## Issues Found
- **Incorrect claim about combining target_size_bytes and target_size_ratio** (line 101): The post stated "When both are set, the larger of the two values takes precedence." This is incorrect. Ceph generates a `POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO` health warning when both are set on the same pool, and the documentation advises against setting both. Fixed to warn users not to set both and to mention the health warning.

## Review Notes
- All byte calculations are correct (1 TiB = 1099511627776, 500 GiB = 536870912000, 2 TiB = 2199023255552).
- The CLI commands use correct syntax for `ceph osd pool set`.
- The CephBlockPool YAML uses the correct `parameters` field for passing pool-level settings, which is the supported Rook approach.
- The "Using Human-Readable Units via CLI" section title is slightly misleading since the section demonstrates calculating bytes with Python rather than showing actual human-readable CLI input, but the content itself is technically correct.
- The guidelines in "Choosing target_size_bytes Values" are reasonable rules of thumb but are not from official Ceph documentation — they are the author's recommendations.
