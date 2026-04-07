# Validation Summary: How to Share CephFS Directories via SMB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CephFS, subvolumes, quotas)
- Samba (SMB file sharing, smb.conf, vfs_ceph)
- Rook (mentioned in tags as the Ceph orchestrator context)
- Linux POSIX permissions (chown, chmod, setgid)

## Sources Consulted
- Ceph official documentation for `ceph fs subvolume` CLI commands (https://docs.ceph.com/en/latest/cephfs/fs-volumes/)
- Samba `vfs_ceph` module documentation (https://www.samba.org/samba/docs/current/man-html/vfs_ceph.8.html)
- Samba `smb.conf` man page for share configuration parameters (https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html)

## Issues Found

### 1. `--size` parameter accepts bytes, not human-readable suffixes
**What was wrong:** The `ceph fs subvolume create` commands used human-readable size values (`500G`, `1T`, `2T`), but the `--size` parameter requires an integer value in bytes.
**What was changed:** Replaced `--size 500G` with `--size 536870912000`, `--size 1T` with `--size 1099511627776`, and `--size 2T` with `--size 2199023255552`. Added a comment clarifying that `--size` is in bytes.

### 2. Subvolume paths in smb.conf were incomplete
**What was wrong:** The `path` values in `smb.conf` used `/volumes/smb-shares/marketing` etc., but `ceph fs subvolume getpath` returns a path with a UUID subdirectory (e.g., `/volumes/smb-shares/marketing/a4f3c1e2-...`). The paths as written would not point to the actual subvolume data.
**What was changed:** Updated all three share `path` entries to include a `<uuid>` placeholder and added comments instructing readers to use the actual output from `ceph fs subvolume getpath`.

### 3. `ceph fs subvolume resize` size value was in wrong format
**What was wrong:** The resize command used `600G` but the size parameter requires bytes.
**What was changed:** Replaced `600G` with `644245094400`.

## Review Notes
- The `[archives]` section sets both `writable = no` and `read only = yes`, which are redundant (they mean the same thing). This is not technically wrong — Samba handles it gracefully — but one could be removed for cleaner configuration.
- The `browsable` parameter is a synonym for the canonical `browseable` in Samba. Both are accepted, so this is fine as-is.
- The `kernel share modes = no` setting is correctly used with `vfs objects = ceph`, as kernel share modes are not compatible with the libcephfs VFS backend.
