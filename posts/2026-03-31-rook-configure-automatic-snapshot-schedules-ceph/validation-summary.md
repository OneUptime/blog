# Validation Summary: How to Configure Automatic Snapshot Schedules in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (storage platform)
- Ceph `snap_schedule` manager module (CephFS snapshot scheduling)
- RBD mirroring snapshot scheduling (`rbd mirror snapshot schedule`)
- CephFS scheduled snapshots
- Rook (mentioned in tags, not directly covered in commands)

## Sources Consulted
- Ceph official documentation: CephFS Snapshot Scheduling (https://docs.ceph.com/en/latest/cephfs/snap-schedule/)
- Ceph official documentation: RBD Mirroring / Snapshot Scheduling (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph official documentation: RBD Snapshots (https://docs.ceph.com/en/latest/rbd/rbd-snapshot/)
- Ceph `rbd` man page for `mirror snapshot schedule` subcommands

## Issues Found

### Issue 1: Incorrect claim that `snap_schedule` module handles both RBD and CephFS (High severity)
- **What was wrong:** The opening paragraph stated "The `snap_schedule` manager module enables automatic, time-based snapshot creation for both RBD images and CephFS directories." The `snap_schedule` mgr module is CephFS-only. RBD snapshot scheduling uses the `rbd mirror snapshot schedule` commands as part of the RBD mirroring subsystem.
- **What was changed:** Rewrote the opening to clarify that CephFS uses the `snap_schedule` module while RBD uses `rbd mirror snapshot schedule` commands.

### Issue 2: Incorrect RBD prerequisite — `deep-flatten` instead of mirroring (High severity)
- **What was wrong:** The section "Enable Mirroring (Required for RBD Snap Schedule)" showed `rbd feature enable mypool/myimage deep-flatten` as a prerequisite. The `deep-flatten` feature is for flattening cloned images and is completely unrelated to snapshot scheduling. RBD snapshot scheduling requires snapshot-based mirroring to be enabled on the pool and image.
- **What was changed:** Replaced with the correct commands: `rbd mirror pool enable mypool image` and `rbd mirror image enable mypool/myimage snapshot`. Updated the section heading to "Enable Snapshot-Based Mirroring."

### Issue 3: Incorrect RBD command name — `rbd snap schedule` does not exist (High severity)
- **What was wrong:** All RBD commands used `rbd snap schedule` (e.g., `rbd snap schedule add`, `rbd snap schedule ls`, `rbd snap schedule rm`). The correct command is `rbd mirror snapshot schedule`.
- **What was changed:** Updated all three RBD commands to use `rbd mirror snapshot schedule add`, `rbd mirror snapshot schedule list`, and `rbd mirror snapshot schedule remove`.

### Issue 4: Incorrect subcommand names for RBD schedule (Medium severity)
- **What was wrong:** Used `ls` instead of `list` and `rm` instead of `remove` for the RBD schedule subcommands.
- **What was changed:** Changed to `list` and `remove` to match official documentation.

### Issue 5: Incorrect Unix timestamps in example snapshot filenames (Low severity)
- **What was wrong:** The example snapshot names `_scheduled_2026-03-31-000000_1711843200` and `_scheduled_2026-03-30-000000_1711756800` contained Unix timestamps corresponding to 2024 dates (March 31 and March 30, 2024), not 2026 as shown in the filename date portion.
- **What was changed:** Corrected to `1774915200` (2026-03-31T00:00:00 UTC) and `1774828800` (2026-03-30T00:00:00 UTC).

## Review Notes
- The CephFS section commands are correct. The `--fs` keyword argument style is an acceptable alternative to the positional argument style shown in the official docs.
- The `ceph fs snap-schedule status` example output JSON is a reasonable representation but exact fields may vary by Ceph version.
- The post tags include "Rook" but the content covers native Ceph commands, not Rook-specific CRDs. This is acceptable since Rook deploys Ceph and these commands apply within a Rook-managed cluster.
- The `ceph fs snap-schedule retention add /data d 7 --fs myfs` syntax using separate period (`d`) and count (`7`) arguments is valid per the documented `<retention_spec_or_period> [<retention_count>]` signature.
