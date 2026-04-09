# Validation Summary: How to List and Inspect CephFS Subvolumes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CephFS)
- Rook
- CephFS Subvolumes and Subvolume Groups
- Ceph CLI (`ceph fs subvolume` commands)
- Bash scripting

## Sources Consulted
- Ceph official documentation — CephFS Volumes: https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Ceph official documentation (Reef release): https://docs.ceph.com/en/reef/cephfs/fs-volumes/
- Ceph source code (`src/pybind/mgr/volumes/fs/`) for subvolume state definitions and default group naming

## Issues Found

1. **Incorrect subvolume states (line 72)**: The post listed states as `complete, pending, in-progress, retained, purging`. The official Ceph documentation defines only two subvolume states: `complete` and `snapshot-retained`. The states `pending` and `in-progress` are clone operation states (from `ceph fs clone status`), not subvolume states. `purging` is not a documented state at all. Fixed to `complete, snapshot-retained`.

2. **Wrong state name `retained` (lines 77, 133)**: The post referred to the state as `retained` in two places. The correct name is `snapshot-retained` (with the `snapshot-` prefix). Fixed both occurrences.

3. **Missing fields in example `subvolume info` output (lines 48-69)**: The example JSON output was missing `ctime` (change time) and `mtime` (modification time), which are standard fields returned by `ceph fs subvolume info`. Added both fields to the example for accuracy.

## Review Notes
- The `--format json` flag used throughout the post is technically redundant for `ceph fs subvolume` commands since they return JSON natively. However, it is not incorrect — the Ceph CLI framework accepts the flag — and including it is a reasonable defensive practice for scripting, so it was left as-is.
- The audit script uses unquoted variable expansions (e.g., `${GROUP_OPT}` without quotes) which is intentional to allow word splitting for flag passing. This is a pragmatic shell scripting pattern, though it would break on subvolume/group names containing spaces. This was not changed as it matches common Ceph scripting patterns.
- The `bytes_quota` field is shown as an integer in the example. When no quota is set, Ceph returns the string `"infinite"` instead. The example shows a case where a quota is set, which is correct.
