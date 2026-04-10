# Validation Summary: How to Configure Per-Pool Weight Sets in CRUSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH algorithm, weight sets, balancer module)
- Rook (Ceph orchestration on Kubernetes)
- crushtool (CRUSH map compiler/decompiler)
- Ceph CLI (`ceph osd crush weight-set`, `ceph balancer`)

## Sources Consulted
- Ceph Balancer Module Documentation: https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph CRUSH Maps Documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph CRUSH Map Editing Documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- Ceph Control Commands Documentation: https://docs.ceph.com/en/reef/rados/operations/control/
- Ceph GitHub: Weight-Set Commands (PR #16326)
- Ceph GitHub: choose-args test examples (`src/test/cli/crushtool/choose-args.crush`)
- Ceph GitHub: Balancer module source code (`src/pybind/mgr/balancer/module.py`)

## Issues Found

### 1. Incorrect claim: upmap mode manages per-pool weight sets (Major)
**What was wrong:** The "Enabling Per-Pool Weight Sets" section stated that per-pool weight sets are "managed automatically by the Ceph balancer in `upmap` mode" and showed `ceph balancer mode upmap` / `ceph balancer on` commands. This is incorrect. The upmap balancer mode uses PG remapping (pg-upmap-items) to optimize placement, not weight sets. Per-pool weight sets must be created and managed explicitly using `ceph osd crush weight-set` CLI commands.
**What was changed:** Replaced the section description and commands with the correct CLI workflow: `ceph osd crush weight-set create <pool> flat`, `ceph osd crush weight-set reweight`, and `ceph osd crush weight-set ls`.

### 2. Incorrect attribution to balancer in intro (Minor)
**What was wrong:** The intro paragraph stated per-pool weight sets "allow the balancer to independently tune distribution for each pool," implying the mgr balancer module manages per-pool weight sets. Neither the upmap nor crush-compat balancer modes manage per-pool weight sets.
**What was changed:** Changed to "allow independently tuning distribution for each pool" to remove the incorrect balancer attribution.

### 3. Wildcard removal command does not work (Medium)
**What was wrong:** `ceph osd crush weight-set rm *` was shown for removing all weight sets. The shell glob `*` would expand to filenames in the current directory, not pool names. The `rm` subcommand does not accept wildcards.
**What was changed:** Replaced with `ceph osd crush weight-set ls` followed by `ceph osd crush weight-set rm mypool` to show the correct workflow of listing and individually removing each pool's weight set.

### 4. Summary repeated the upmap error (Minor)
**What was wrong:** The summary paragraph stated "Enable them by running the balancer in `upmap` mode, which manages these weight sets automatically."
**What was changed:** Updated to "Create them using `ceph osd crush weight-set create` and adjust weights with the `reweight` subcommand."

## Review Notes
- The `choose_args` syntax shown in the manual CRUSH map editing section uses a nested array format (`weight_set [ [...] ]`). The decompiled text format from `crushtool -d` may vary between Ceph versions. More recent versions may use a `position N weights [...]` syntax. The format shown should work but readers should verify against the output of `crushtool -d` on their specific Ceph version.
- The `ceph balancer optimize myplan --pools mypool` command uses `--pools` as a flag, which appears to be valid in recent Ceph versions (Quincy+). Readers on older versions should check their Ceph CLI help for the exact syntax.
- The balancer eval/optimize/execute sections remain in the post. While these are general balancer commands (not specific to per-pool weight sets), they are useful for evaluating distribution quality alongside per-pool weight set adjustments.
- The post mentions Ceph Luminous (12.x) as the minimum version, but some commands and syntax may have evolved in newer releases (Pacific, Quincy, Reef). Readers should consult the documentation for their specific Ceph version.
