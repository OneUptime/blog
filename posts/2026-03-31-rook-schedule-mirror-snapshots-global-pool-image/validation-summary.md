# Validation Summary: How to Schedule Mirror Snapshots (Global, Pool, Image Level)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Ceph RBD Mirroring (snapshot-based mode)
- `rbd mirror snapshot schedule` CLI commands
- `rbd_support` Ceph MGR module
- Rook Ceph Operator
- CephBlockPool CRD (`ceph.rook.io/v1`)

## Sources Consulted
- Ceph official documentation: RBD Mirroring (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- Ceph source code: `src/tools/rbd/action/MirrorSnapshotSchedule.cc` and `src/tools/rbd/Schedule.cc` for CLI argument parsing
- Rook documentation and CRD definitions: `pkg/apis/ceph.rook.io/v1/types.go` for CephBlockPool and CephRBDMirror specs

## Issues Found
1. **`interval` and `start-time` used as flags instead of positional arguments.** All `rbd mirror snapshot schedule add` and `remove` commands incorrectly used `--interval` and `--start-time` as named flags. In the actual Ceph CLI, `interval` and `start-time` are positional arguments. Fixed all occurrences:
   - `rbd mirror snapshot schedule add --interval 1h` → `rbd mirror snapshot schedule add 1h`
   - `--start-time 02:00:00` → positional `02:00:00` after the interval
   - Same correction applied to pool-level, image-level, toolbox, and remove commands.

2. **Incorrect claim that `CephRBDMirror` supports image-level snapshot schedules.** The post stated "use the `CephRBDMirror` resource or annotate the image directly via the toolbox" for image-level schedules. The `CephRBDMirror` CRD only configures the rbd-mirror daemon (count, placement, resources) and has no snapshot schedule fields. Removed the `CephRBDMirror` mention; only the toolbox CLI approach is valid for image-level schedules.

## Review Notes
- The Rook `CephBlockPool` YAML snippet is correct — `snapshotSchedules` with `interval` and `startTime` fields match the CRD definition.
- The `rbd mirror snapshot schedule list --recursive` command is valid; both `list` and `ls` are accepted as aliases.
- The `rbd_support` MGR module claim is correct.
- The `start-time` positional argument accepts ISO 8601 format with optional timezone offset (e.g., `14:00:00-05:00`). The examples in the post use simple time format (`02:00:00`, `00:00:00`) which is valid and assumes UTC.
