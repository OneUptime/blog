# Validation Summary: How to Fix OLD_CRUSH_STRAW_CALC_VERSION Health Check in Ceph

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ceph (CRUSH map, OSD management, health checks)
- Rook-Ceph (Kubernetes operator for Ceph)
- crushtool (CRUSH map compilation/decompilation)
- kubectl (Kubernetes CLI for Rook toolbox access)

## Sources Consulted
- Ceph CRUSH Tunables documentation (https://docs.ceph.com/en/latest/rados/operations/crush-map/#crush-tunables)
- Ceph CRUSH Map documentation (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph Health Checks documentation (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph release history (Firefly = 0.80, Hammer = 0.94)
- Rook Ceph Toolbox documentation (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found

### 1. Incorrect Firefly version number
- **What was wrong:** The post stated "Firefly (0.93)". Firefly is version 0.80. Version 0.94 is Hammer.
- **What was changed:** Corrected to "Firefly (0.80)".
- **Why:** Incorrect version numbers can confuse readers checking compatibility or planning upgrades.

### 2. Conflation of straw_calc_version with straw2 bucket type
- **What was wrong:** The post described `straw_calc_version=1` as using the "straw2" algorithm in multiple places (description, intro paragraph, explanation, summary). The `straw_calc_version` tunable and the `straw2` bucket type are two separate concepts. `straw_calc_version=1` corrects a bug in the original straw weight calculation; it does not switch to the `straw2` bucket type (which is a completely different algorithm set per-bucket).
- **What was changed:** Replaced references to "straw2 algorithm" with "corrected straw calculation" throughout the post (description metadata, intro paragraph, version explanation, and summary).
- **Why:** Conflating these two concepts could lead readers to believe they've migrated to straw2 when they haven't, potentially causing them to skip the separate straw2 migration if desired.

### 3. Characterization of original straw issue
- **What was wrong:** The post described the original straw issue as "an uneven distribution problem," which is slightly imprecise. The core issue is a bug in the weight calculation that causes unnecessary data movement across unrelated OSDs when one OSD's weight changes.
- **What was changed:** Changed "uneven distribution problem" to "bug" for accuracy.
- **Why:** It's a calculation bug, not a fundamental distribution problem. The distinction matters for understanding the severity and nature of the fix.

## Review Notes
- All CLI commands (`ceph osd getcrushmap`, `crushtool -d/-c`, `ceph osd setcrushmap`, `ceph osd set/unset noout`, kubectl commands) are correct and current.
- The `sed -i` command uses GNU sed syntax (no backup extension), which is correct for Linux environments where Ceph typically runs. It would fail on macOS BSD sed, but this is expected to run on Ceph nodes or inside a Rook toolbox (Linux).
- The advice to use `noout` during CRUSH map changes is sound operational guidance.
- The post could benefit from mentioning that users can also update the CRUSH tunables profile via `ceph osd crush tunables firefly` (or higher) as an alternative to manual map editing, but this is an enhancement rather than a correction.
- Readers interested in further optimization should also consider migrating bucket types from `straw` to `straw2`, which is a separate operation from updating `straw_calc_version`.
