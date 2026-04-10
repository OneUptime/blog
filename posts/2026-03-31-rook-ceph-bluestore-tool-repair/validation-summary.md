# Validation Summary: How to Use ceph-bluestore-tool for BlueStore Repair

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (BlueStore storage backend)
- ceph-bluestore-tool CLI utility
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- BlueFS (BlueStore filesystem layer)

## Sources Consulted
- Official Ceph man page for ceph-bluestore-tool: https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/
- ceph-bluestore-tool RST source on GitHub: https://github.com/ceph/ceph/blob/main/doc/man/8/ceph-bluestore-tool.rst
- Ubuntu man page (Jammy): https://manpages.ubuntu.com/manpages/jammy/man8/ceph-bluestore-tool.8.html

## Issues Found

### Issue 1: Incorrect `bluefs-bdev-expand` usage with `--dev-target main`
- **What was wrong:** The "Fix Missing or Mismatched Labels" section contained a command `ceph-bluestore-tool bluefs-bdev-expand --path /var/lib/ceph/osd/ceph-0 --dev-target main` described as "Re-label a device after replacement." This was wrong in multiple ways: (a) `bluefs-bdev-expand` does not accept a `--dev-target` flag, (b) `main` is not a valid BlueFS device role, and (c) `bluefs-bdev-expand` expands BlueFS to use available space on a block device — it does not re-label anything.
- **What was changed:** Removed the incorrect `bluefs-bdev-expand --dev-target main` command entirely. The correct usage of `bluefs-bdev-expand` (without `--dev-target`) was already present in the "Expand BlueFS into Free Space" section.
- **Why:** The command would fail if executed and the description was misleading. The section title was also changed from "Fix Missing or Mismatched Labels" to "Migrate BlueFS Data Between Devices" to accurately reflect the remaining `bluefs-bdev-migrate` command.

### Issue 2: Incorrect flag name `--allocator-type` for `free-dump` and `free-score`
- **What was wrong:** Both `free-dump` and `free-score` commands used `--allocator-type block`. The correct flag name is `--allocator`, not `--allocator-type`.
- **What was changed:** Changed `--allocator-type block` to `--allocator block` in both commands.
- **Why:** The `--allocator-type` flag does not exist; the correct flag per the official man page is `--allocator`.

## Review Notes
- The post correctly emphasizes that the OSD must be stopped before running `ceph-bluestore-tool` — this is a critical safety requirement.
- The `fsck`, `repair`, `show-label`, `bluefs-bdev-migrate`, and `bluefs-bdev-expand` commands all use correct syntax after the fixes.
- The valid values for `--allocator` include `block`, `bluefs-wal`, `bluefs-db`, and `bluefs-slow` — the post only demonstrates `block`, which is the most common use case.
