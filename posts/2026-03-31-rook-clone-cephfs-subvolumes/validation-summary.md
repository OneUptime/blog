# Validation Summary: How to Clone CephFS Subvolumes

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (CephFS)
- Rook (referenced in tags)
- CephFS Subvolumes and Snapshots
- CephFS Subvolume Cloning

## Sources Consulted
- Ceph official documentation — FS Volumes and Subvolumes (Reef): https://docs.ceph.com/en/reef/cephfs/fs-volumes/
- Ceph official documentation — FS Volumes and Subvolumes (Latest): https://docs.ceph.com/en/latest/cephfs/fs-volumes/
- Ceph Octopus release notes (deprecation of snapshot protect/unprotect): https://docs.ceph.com/en/latest/releases/octopus/
- GitHub PR #36126 — Deprecate protect/unprotect CLI calls for subvolume snapshots: https://github.com/ceph/ceph/pull/36126

## Issues Found

1. **Wrong command for clone status (`ceph fs subvolume clone status` → `ceph fs clone status`)**: The post used `ceph fs subvolume clone status` in three places (checking clone status, watch command, and cloning between groups). The correct command is `ceph fs clone status <vol_name> <clone_name>`. Fixed all three occurrences.

2. **Wrong command for clone cancel (`ceph fs subvolume clone cancel` → `ceph fs clone cancel`)**: The post used `ceph fs subvolume clone cancel` but the correct command is `ceph fs clone cancel <vol_name> <clone_name>`. Fixed.

3. **Snapshot protect/unprotect presented as required steps**: The post stated that protecting the snapshot was "required before cloning" and included `ceph fs subvolume snapshot protect` and `ceph fs subvolume snapshot unprotect` as mandatory workflow steps. These commands were deprecated in Ceph Octopus (v15.2.0, released March 2020) and are now no-ops. Removed the protect/unprotect commands from the workflow steps and added a note explaining the deprecation for users on older Ceph versions.

4. **Missing `canceled` clone state**: The clone states list omitted `canceled`, which is a valid state when a user cancels a clone operation via `ceph fs clone cancel`. Added it to the list.

5. **Argument order in "Cloning Between Groups" section**: The snapshot create command had `--group_name production` placed between positional arguments (`ceph fs subvolume snapshot create cephfs db --group_name production prod-snap`). Reordered to the conventional form with all positional arguments first: `ceph fs subvolume snapshot create cephfs db prod-snap --group_name production`. Also removed the now-unnecessary `snapshot protect` command from this section.

## Review Notes
- The kernel mount syntax (`mount -t ceph mon1:6789:/path`) is the legacy format. Newer Ceph versions support a `mount -t ceph name@fsid.fs_name=/path` syntax via mount.ceph helper. Both work; the legacy syntax shown is acceptable for a general guide.
- The post does not specify a minimum Ceph version. All commands shown are valid for Ceph Octopus (v15.2.0) and later.
