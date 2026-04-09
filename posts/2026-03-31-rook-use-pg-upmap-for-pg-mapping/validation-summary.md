# Validation Summary: How to Use pg-upmap for PG Mapping in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (pg-upmap, CRUSH algorithm, balancer module, OSD management)
- Rook (Kubernetes Ceph operator, rook-ceph-tools deployment)
- Kubernetes (kubectl exec commands)

## Sources Consulted
- Ceph official documentation on upmap: https://docs.ceph.com/en/latest/rados/operations/upmap/
- Ceph official documentation on balancer module: https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph source code (src/mon/OSDMonitor.cc, src/mon/MonCommands.h, src/osd/OSDMap.cc) for command syntax and behavior verification

## Issues Found

1. **Incorrect description of `ceph pg map` output**: The post described `ceph pg map 1.0` as showing "the current CRUSH-computed mapping." This is inaccurate. `ceph pg map` shows the **effective** mapping after upmap overrides are applied (it internally calls `_apply_upmap`), not the raw CRUSH-computed mapping. Fixed the description to: "View the current effective mapping for a PG (includes any upmap overrides)."

2. **Overly broad grep in "remove all upmap overrides" pipeline**: The command used `grep upmap` which matches all upmap entry types (`pg_upmap`, `pg_upmap_items`, `pg_upmap_primary`), but `ceph osd rm-pg-upmap-items` only removes `pg_upmap_items` entries. Using the broad grep could feed non-items PG IDs to the removal command (harmless but incorrect). Fixed to `grep '^pg_upmap_items '` for precision.

## Review Notes
- The `ceph mgr module enable balancer` command is valid syntax but unnecessary on Ceph Octopus (v15.2.x) and later, where the balancer is an always-on module. The post does not specify a Ceph version, so this is not wrong but could be noted for readers on modern clusters.
- Similarly, `ceph balancer mode upmap` is the default mode since at least Pacific, so this command is a no-op on fresh modern clusters. Again, not incorrect but potentially unnecessary.
- The `ceph osd pg-upmap-items` syntax with pairs of OSD IDs (from/to) was verified as correct against the source code.
- The Luminous client requirement claim was verified as accurate per both documentation and source code.
- The balancer eval/optimize/execute workflow was verified as correct.
