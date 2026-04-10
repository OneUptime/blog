# Validation Summary: How to Balance Data Distribution Across Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (balancer module, PG autoscaling, CRUSH maps, OSD management)
- Rook (CephBlockPool CRD, rook-ceph-tools deployment)
- Kubernetes (kubectl exec)

## Sources Consulted
- Ceph official documentation: Balancer Module (https://docs.ceph.com/en/latest/rados/operations/balancer/)
- Ceph official documentation: Placement Groups (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph official documentation: CRUSH Map (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: Control Commands (https://docs.ceph.com/en/latest/rados/operations/control/)
- Rook documentation: CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph CLI reference for `ceph osd`, `ceph balancer`, `ceph df` commands

## Issues Found
1. **Incorrect command for enabling PG autoscaling globally**: The post used `ceph osd pool set noautoscale off`, which is syntactically incorrect. The `noautoscale` flag uses `set`/`unset` semantics, not a key-value pair. Fixed to `ceph osd pool unset noautoscale`.

2. **Misleading section title "Adjust CRUSH Weights"**: The section included `ceph osd reweight-by-utilization`, which adjusts OSD reweight (a temporary 0-1 override), not CRUSH weight (a persistent value reflecting disk size). Renamed section to "Adjust OSD and CRUSH Weights" and clarified the comment for `reweight-by-utilization` to distinguish it from CRUSH weight adjustment.

3. **Incorrect location of `misplaced` objects in `ceph status` output**: The post stated to look at the `io` section for `misplaced` objects, but `misplaced` objects are reported in the `pgs` section. The `io` section shows client and recovery bandwidth/IOPS. Fixed to reference both the `pgs` section (for misplaced count) and `io` section (for recovery throughput).

## Review Notes
- All `ceph balancer` commands (`status`, `mode upmap`, `on`, `optimize`, `eval`, `execute`) are correct and well-documented.
- The Rook CephBlockPool YAML snippet correctly uses the `parameters` field for `pg_autoscale_mode` and `target_size_ratio`.
- The `upmap` balancer mode is correctly identified as the recommended mode for modern clusters.
- The `watch` command should be available in the rook-ceph-tools container, though availability could vary by Rook version.
- Readers should be aware that `ceph osd reweight-by-utilization` and `ceph osd crush reweight` are fundamentally different mechanisms: reweight is a temporary 0-1 multiplier while CRUSH weight is persistent and typically reflects disk size in TB.
