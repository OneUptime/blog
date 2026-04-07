# Validation Summary: How to Set target_size_ratio for PG Autoscaling in Ceph

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
- Ceph official documentation on pool operations (`ceph osd pool set`): https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook documentation on CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that Ceph normalizes ratios internally when they exceed 1.0. It is worth noting that Ceph also raises a `POOL_TARGET_SIZE_RATIO_OVERCOMMITTED` health warning in this case, though omitting this detail does not make the post incorrect.
- All CLI commands use correct syntax and flags for `ceph osd pool set` and `ceph osd pool autoscale-status`.
- The CephBlockPool YAML correctly places `target_size_ratio` and `pg_autoscale_mode` under `spec.parameters`, which Rook passes through to Ceph as pool properties.
- The guidance on when to use `target_size_ratio` vs `target_size_bytes` is accurate and practical.
