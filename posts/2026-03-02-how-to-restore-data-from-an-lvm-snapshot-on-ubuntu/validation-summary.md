# Validation Summary: How to Restore Data from an LVM Snapshot on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- LVM (Logical Volume Manager)
- LVM snapshots and snapshot merge (`lvconvert --merge`)
- `lvs`, `lvchange`, `lvcreate`, `lvremove`, `vgscan`, `vgchange`
- ext4 filesystem and `e2fsck`
- PostgreSQL data directory recovery
- rsync, mount, umount
- systemd service management (`systemctl`)

## Sources Consulted
- LVM administrator guide / `lvconvert(8)` documentation — https://man7.org/linux/man-pages/man8/lvconvert.8.html
- `lvs(8)` documentation including the `lv_attr` field format — https://man7.org/linux/man-pages/man8/lvs.8.html
- `vgscan(8)` and `vgchange(8)` — https://man7.org/linux/man-pages/man8/vgchange.8.html
- Red Hat LVM administration guide (snapshot merge semantics)
- PostgreSQL documentation for `pg_is_in_recovery()` — https://www.postgresql.org/docs/current/functions-admin.html
- Ubuntu PostgreSQL package data directory layout (`/var/lib/postgresql/<version>/main`)
- `e2fsck(8)` and `mount(8)` man pages

## Issues Found
- **Misleading comment in Method 2, Step 3**: The original code comment said "Restore an entire directory" but the accompanying `rsync` example targeted a single file (`pg_hba.conf`), not a directory. Updated the comment to "Restore using rsync (preserves permissions, ownership, timestamps)" so it accurately describes the example.

## Review Notes
- The `lv_attr` decoding in the "Before You Start" section is simplified ("snapshot, writable, inactive/active") but matches the practical meaning of the `swi` prefix. The full LVM attribute encoding is more granular (10 positions covering volume type, permissions, allocation policy, fixed minor, state, device, target type, etc.), but the post's simplification is acceptable for a recovery-focused tutorial.
- The merge semantics are correct: with `lvconvert --merge`, when both origin and snapshot are inactive the merge runs immediately and the snapshot is automatically removed afterwards; if either is active, the merge is deferred to the next activation of the origin.
- The note that LVM metadata is stored on the PVs themselves and reappears on disk import is accurate.
- The selective PostgreSQL file restore example (`cp /mnt/recovery/base/16384/1259 ...`) is technically possible but in practice copying individual relation files can leave the cluster inconsistent with WAL/MVCC state. The post correctly warns to stop PostgreSQL first, but a reader should treat this as a last-resort technique — full directory restores are far safer.
- The PostgreSQL data directory should also be mode `0700` after restore. `chown -R postgres:postgres` is shown but `chmod 700` is not — PostgreSQL will refuse to start if the data directory permissions are wider than `0700` (or `0750` on modern versions), so a reader hitting that error should add `sudo chmod 700 /var/lib/postgresql/14/main`.
- The version-specific path `/var/lib/postgresql/14/main` is correct for Ubuntu's `postgresql-14` package. Readers on different PostgreSQL versions need to adjust the version number accordingly.
