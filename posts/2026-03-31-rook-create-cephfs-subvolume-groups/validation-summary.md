# Validation Summary: How to Create CephFS Subvolume Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CephFS)
- Rook (referenced in tags)
- CephFS subvolumes and subvolume groups
- CephFS snapshots

## Sources Consulted
- Ceph official documentation: CephFS Volumes (https://docs.ceph.com/en/latest/cephfs/fs-volumes/)
- Ceph Reef stable release documentation for subvolume group commands

## Issues Found

### 1. Subvolume group snapshots are no longer supported (FIXED)
- **What was wrong:** The "Snapshotting an Entire Group" section presented `ceph fs subvolumegroup snapshot create` as a working command. Subvolume group-level snapshot creation has been removed from mainline CephFS. Only `ls` and `rm` remain for managing pre-existing group snapshots.
- **What was changed:** Replaced the section with subvolume-level snapshot commands (`ceph fs subvolume snapshot create/ls/rm` with `--group_name`), and added a loop example showing how to snapshot all subvolumes in a group. Updated the section title from "Snapshotting an Entire Group" to "Snapshotting Subvolumes in a Group".
- **Why:** The deprecated group snapshot create command would fail if a user attempted to run it. Per-subvolume snapshots are the supported approach.

### 2. Summary and bullet point referenced group-level snapshots (FIXED)
- **What was wrong:** The summary paragraph mentioned "group-level snapshots" and a bullet point in the "What is a Subvolume Group" section mentioned snapshot capability at the group level.
- **What was changed:** Updated to "per-subvolume snapshots" in the summary, and removed the snapshot reference from the group capabilities bullet point.
- **Why:** Consistency with the corrected snapshot section; avoids implying group-level snapshots are available.

## Review Notes
- All other commands (`subvolumegroup create`, `ls`, `info`, `subvolume create` with `--group_name`, `getpath`, etc.) are syntactically correct and match official Ceph documentation.
- Flag names correctly use underscores (`--pool_layout`, `--group_name`) matching the Ceph CLI convention.
- The `--size` flag for `subvolumegroup create` is valid and correctly described as applying a quota.
- The `--uid`, `--gid`, and `--mode` flags are valid for `subvolumegroup create`.
- The default group `_nogroup` is correctly documented.
- The path format `/volumes/<group>/<subvolume>/<uuid>` is accurate.
- The byte values used for sizes are correct (e.g., 107374182400 = 100 GB, 21474836480 = 20 GB, etc.).
