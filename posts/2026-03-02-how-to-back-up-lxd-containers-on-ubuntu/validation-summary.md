# Validation Summary: How to Back Up LXD Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- LXD / LXC CLI
- LXD instance snapshots, exports, imports, and remote copy/move
- ZFS snapshots and send/receive
- Bash scripting
- systemd service and timer units

## Sources Consulted
- LXD documentation: How to back up instances - https://documentation.ubuntu.com/lxd/latest/howto/instances_backup/
- LXD documentation: How to migrate LXD instances between servers - https://documentation.ubuntu.com/lxd/latest/howto/instances_migrate/
- LXD CLI manpage: `lxc snapshot` - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/snapshot/
- LXD CLI manpage: `lxc restore` - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/restore/
- LXD CLI manpage: `lxc export` - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/export/
- LXD CLI manpage: `lxc import` - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/import/
- LXD CLI manpage: `lxc copy` - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/copy/
- LXD CLI manpage: `lxc move` - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/move/
- LXD storage driver reference - https://documentation.ubuntu.com/lxd/latest/reference/storage_drivers/
- OpenZFS manpage: `zfs-send` - https://openzfs.github.io/openzfs-docs/man/v2.1/8/zfs-send.8.html
- OpenZFS manpage: `zfs-receive` - https://openzfs.github.io/openzfs-docs/man/v2.1/8/zfs-receive.8.html
- systemd.timer manpage - https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- systemd.service manpage - https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The post showed `lxc snapshot --stateful mycontainer` as a container backup command. Current LXD documentation says stateful snapshots are for virtual machines and are not supported for containers, so the example was replaced with a note to use normal container snapshots and application quiescing where needed.
- The restore section described `--stateful` as restoring without starting. In LXD, `--stateful` restores a snapshot's running state when available, so the example was changed to a stateful VM restore.
- The "snapshot all running containers" loop listed all container names, including stopped containers. It now filters the CSV status column for `RUNNING`.
- The manual retention script used `grep -A1 "Snapshots:"`, which only inspects the first line after the snapshot header and can miss additional snapshots. It now extracts all snapshot names from the snapshot section.
- The snapshot expiry command used `lxc config set` with `expires_at` as though it were a normal instance config key. LXD documents snapshot expiry as the snapshot `expires_at` field, so the command was changed to an official `lxc query --request PATCH` example.
- The export section called exported instances "image tarballs" and restored them with `lxc image import` plus `lxc init`. LXD instance exports are backup tarballs restored with `lxc import`, so that section was corrected.
- The generic automated backup script used `--optimized-storage`, which only applies to compatible storage drivers such as ZFS and Btrfs and restricts restores to similar pools. The generic script now uses a normal `lxc export`.
- The automated backup script's snapshot cleanup parsing was made consistent with the corrected retention parsing so it evaluates all auto snapshots.
- The remote migration example used a non-existent/unsupported `lxc move --live` container command. Current LXD documentation says containers must be stopped for migration; the example now stops the container and uses `lxc move`.

## Review Notes
- The ZFS examples are syntactically valid examples, but operators must replace `lxd-pool` with the actual dataset name used by their LXD storage pool.
- The article correctly notes that LXD snapshots stay in the same storage pool and are not a substitute for off-host backups.
- LXD documentation also notes that custom storage volumes attached to an instance are not part of the instance backup and must be backed up separately; that would be a useful future enhancement, but it was not required to correct the existing post.
