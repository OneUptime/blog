# Validation Summary: How to Use Ceph RGW as Backup Target for Borg

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- BorgBackup (Borg) - deduplicating backup tool
- Ceph RADOS Gateway (RGW) - S3-compatible object storage
- Rook - Ceph operator for Kubernetes
- rclone - cloud storage mount/sync tool
- radosgw-admin - Ceph RGW administration CLI
- AWS CLI (for S3 bucket creation)

## Sources Consulted
- BorgBackup official documentation (borgbackup.readthedocs.io) - verified `borg extract`, `borg create`, `borg prune`, `borg compact`, `borg init`, and `borg list` commands and their flags
- BorgBackup Borg 1.4.x (stable) and Borg 2.0.0b22 documentation for `borg extract` options
- rclone official documentation (rclone.org) - verified S3 provider configuration for Ceph and `rclone mount` flags
- Ceph documentation - verified radosgw-admin user creation syntax and default RGW port (7480)

## Issues Found
- **Invalid `--target` flag on `borg extract` (Step 7)**: The original command `borg extract /mnt/borg-ceph/myserver-repo::myserver-2026-03-31 --target /restore` used a `--target` flag that does not exist in BorgBackup (neither Borg 1.x nor Borg 2.x). Borg always extracts to the current working directory. This was likely confused with Restic, which does have a `--target` option. Fixed to: `mkdir -p /restore && cd /restore && borg extract /mnt/borg-ceph/myserver-repo::myserver-2026-03-31`.

## Review Notes
- `borg compact` was introduced in Borg 1.2 and is not available in Borg 1.1 or earlier. The post does not specify a Borg version, but since `borg compact` is used, readers should ensure they have Borg 1.2+ installed.
- The `--allow-other` flag in the rclone mount command requires `user_allow_other` to be enabled in `/etc/fuse.conf` on the host system. This is not mentioned in the post but may cause issues for readers who haven't configured it.
- Using rclone FUSE mounts with Borg is a viable but not officially supported configuration. Borg's developers generally recommend local or SSH-based repositories for best reliability. The rclone VFS cache (`--vfs-cache-mode full`) mitigates most issues but users should be aware of potential edge cases with object storage latency.
