# Validation Summary: How to Use Application Tag Filtering for Ceph User Caps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (OSD capabilities, user management, pool application tags)
- Rook (CSI driver CephFS provisioner)
- CephFS (tag-based data/metadata pool access)
- RBD (tag-based pool access)
- rados CLI tool

## Sources Consulted
- Ceph official documentation — User Management: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph official documentation — CephFS Client Capabilities: https://docs.ceph.com/en/latest/cephfs/client-auth/
- Ceph OSDCap parser source (OSDCap.cc): https://github.com/ceph/ceph/blob/main/src/osd/OSDCap.cc
- ceph-csi capabilities documentation: https://github.com/ceph/ceph-csi/blob/devel/docs/capabilities.md
- Rook GitHub Issue #4494 — CephFS provisioning permissions: https://github.com/rook/rook/issues/4494
- Ceph Pacific v16.2.0 release notes (blacklist to blocklist rename): https://ceph.io/en/news/blog/2021/v16-2-0-pacific-released/
- rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph man page (pool application commands): https://www.mankier.com/8/ceph

## Issues Found

### 1. Invalid `tag rbd *` syntax (3 occurrences)
- **What was wrong:** The blog used `tag rbd *` as the OSD cap syntax for granting access to all RBD-tagged pools. The Ceph OSD capability parser grammar requires the `key=value` format for tag matching — a bare `*` after the application name is not valid and will fail to parse.
- **What was changed:** All three instances of `tag rbd *` were changed to `tag rbd *=*` (lines 56, 87, and 99).
- **Why:** The OSDCap parser in `src/osd/OSDCap.cc` strictly requires the `tag <application> <key>=<value>` format. The wildcard form `*=*` matches all key-value pairs for the given application.

### 2. Deprecated `osd blacklist` command in mon caps
- **What was wrong:** The sample Rook CSI provisioner output showed `allow command 'osd blacklist'` in the mon caps.
- **What was changed:** Changed to `allow command 'osd blocklist'`.
- **Why:** Starting with Ceph Pacific (v16.2.0), `blacklist` was renamed to `blocklist` throughout the codebase. The old command emits a deprecation warning and will be removed in a future release.

## Review Notes
- The Rook CSI CephFS provisioner sample output shows `allow rw` for both metadata and data OSD caps. The official ceph-csi capabilities documentation recommends `allow rwx` (with execute) for metadata operations. This is not strictly incorrect since `rw` will work for basic operations, but users requiring full metadata operations may need `rwx`.
- The sample output for `ceph osd pool application get` shows `"metadata": "no"` under the cephfs application for the cephfs-data pool. While the structure is illustrative, actual Ceph output for CephFS data pools typically shows `"data": "<fsname>"` without a `"metadata"` key. This is sample output so it does not need to match exactly, but readers should be aware actual output may differ.
