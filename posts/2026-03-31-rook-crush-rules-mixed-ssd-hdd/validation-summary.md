# Validation Summary: How to Create Custom CRUSH Rules for Mixed SSD/HDD Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH map, OSD device classes, pool management)
- Rook (CephBlockPool CRD)
- crushtool (CRUSH map compilation/decompilation)

## Sources Consulted
- Ceph official documentation: CRUSH map rules and device classes (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: CRUSH map editing (https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/)
- Ceph official documentation: Pool management (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Rook documentation: CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)

## Issues Found
1. **Missing `min_size` and `max_size` in custom CRUSH rule**: The hybrid-ssd-primary CRUSH rule definition was missing the `min_size` and `max_size` fields. These fields are required in the CRUSH text format used by `crushtool -c` for compilation. Without them, `crushtool -c crush.txt -o crush-new.bin` would fail with a parse error. Added `min_size 1` and `max_size 10` (standard default values) to the rule definition.

## Review Notes
- The verification script in the "Verifying Correct Placement" section uses `awk '{print $NF}'` to parse `ceph osd map` output. This is fragile because the output format of `ceph osd map` varies between Ceph versions (some include parenthesized primary indicators like `p0)` as the last field). The script demonstrates the right concept but may need adjustment depending on the Ceph version in use.
- The pool creation commands use explicit PG counts (`128 128`, `64 64`). Modern Ceph deployments (Nautilus+) typically rely on the pg-autoscaler module, making explicit PG counts less common. The commands are still valid but readers using recent Ceph versions may prefer to omit the PG counts and let the autoscaler handle it.
