# Validation Summary: How to Manage Mirror Snapshot Schedules in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Ceph RBD Mirroring (snapshot-based mode)
- `rbd mirror snapshot schedule` CLI commands (`ls`, `status`, `add`, `remove`)
- `rbd_support` Ceph MGR module
- Rook Ceph Operator

## Sources Consulted
- Ceph official documentation: RBD Mirroring (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph source code: `src/tools/rbd/action/MirrorSnapshotSchedule.cc` for CLI argument parsing
- Ceph man page: rbd(8) (https://docs.ceph.com/en/latest/man/8/rbd/)
- Previously validated blog post in this repo (`rook-schedule-mirror-snapshots-global-pool-image`) which documented the same `--interval`/`--start-time` flag issue

## Issues Found
1. **`interval` and `start-time` used as named flags instead of positional arguments in `add` and `remove` commands.** The `rbd mirror snapshot schedule add` command used `--interval 30m` and `--start-time "00:00:00"` as named flags, and all `rbd mirror snapshot schedule remove` commands used `--interval` as a named flag. In the actual Ceph CLI, `interval` and `start-time` are positional arguments, not named flags. Fixed all occurrences:
   - `rbd mirror snapshot schedule add --pool replicapool --interval 30m --start-time "00:00:00"` -> `rbd mirror snapshot schedule add --pool replicapool 30m 00:00:00`
   - `rbd mirror snapshot schedule remove --interval 24h` -> `rbd mirror snapshot schedule remove 24h`
   - `rbd mirror snapshot schedule remove --pool replicapool --interval 1h` -> `rbd mirror snapshot schedule remove --pool replicapool 1h`
   - `rbd mirror snapshot schedule remove --pool replicapool --image myimage --interval 15m` -> `rbd mirror snapshot schedule remove --pool replicapool --image myimage 15m`

## Review Notes
- The `rbd mirror snapshot schedule ls` commands with `--pool`, `--image`, and `--recursive` flags are all correct.
- The `rbd mirror snapshot schedule status --pool` command and its example output format are accurate.
- The `ceph mgr module ls | grep rbd_support` troubleshooting approach is correct; the `rbd_support` MGR module is responsible for snapshot scheduling.
- The `rbd mirror image info` command is the correct way to verify mirroring configuration on an image.
- The `rbd snap ls` command correctly shows mirror snapshots, and the `.mirror.primary` naming convention for filtering is accurate.
- The advice that Ceph has no direct "update" command for schedules (requiring remove + add) is correct.
