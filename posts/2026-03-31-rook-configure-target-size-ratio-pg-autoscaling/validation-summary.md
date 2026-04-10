# Validation Summary: How to Configure target_size_ratio for PG Autoscaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (PG Autoscaler, pool management)
- Rook (CephBlockPool CRD)
- Kubernetes (kubectl exec into toolbox pod)

## Sources Consulted
- Ceph official documentation — Autoscaling Placement Groups (Reef): https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph official documentation — Pools: https://docs.ceph.com/en/reef/rados/operations/pools/
- Rook documentation — CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph Blog — PG Autoscaler Tuning: https://ceph.io/en/news/blog/2022/autoscaler_tuning/

## Issues Found
- **Incorrect section heading**: The heading "target_size vs target_size_ratio" was changed to "target_size_bytes vs target_size_ratio". The actual Ceph parameter name is `target_size_bytes`, not `target_size`. The content below the heading already correctly used `target_size_bytes` in the commands, so only the heading was inconsistent.

## Review Notes
- The example output for `ceph osd pool autoscale-status` omits the `BULK` column that was added in Ceph Quincy (17.x) and later. Since the post does not target a specific Ceph version, this is acceptable but readers on newer clusters will see an additional column.
- The `ceph mgr module enable pg_autoscaler` command is correct but note that in Ceph Pacific (16.x) and later the PG autoscaler module is enabled by default. The command is still valid and harmless to run.
- All CLI commands, CRD configuration, and parameter names verified correct against official Ceph and Rook documentation.
- The byte calculation for 100 GiB (107374182400) is correct.
