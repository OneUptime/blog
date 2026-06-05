# Validation Summary: How to Implement Volume Snapshots for Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker volumes and local volume driver
- Docker CLI
- tar archives
- LVM snapshots
- Btrfs subvolumes and snapshots
- ZFS snapshots, clones, send, and receive
- PostgreSQL backup consistency
- cron

## Sources Consulted
- Docker Docs: Volumes and backup/restore guidance - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Btrfs storage driver - https://docs.docker.com/engine/storage/drivers/btrfs-driver/
- Docker Docs: docker volume create CLI reference - https://docs.docker.com/reference/cli/docker/volume/create/
- Linux manual page: lvcreate(8) - https://man7.org/linux/man-pages/man8/lvcreate.8.html
- Btrfs documentation: Btrfs design and snapshot behavior - https://btrfs.readthedocs.io/en/stable/dev/dev-btrfs-design.html
- OpenZFS documentation: zfs(8) - https://openzfs.github.io/openzfs-docs/man/master/8/zfs.8.html
- OpenZFS documentation: ZFS send/receive - https://openzfs.org/wiki/Documentation/ZfsSend
- PostgreSQL documentation: Continuous Archiving and Point-in-Time Recovery - https://www.postgresql.org/docs/current/continuous-archiving.html
- Local Docker CLI help: `docker volume create --help`, `docker run --help`

## Issues Found
- The tar section said the read-only mount prevents modifications during the snapshot. This only prevents the temporary snapshot container from writing to the mounted volume; other containers can still write to the same volume. Updated the wording and added a note to stop or quiesce writers for application-consistent snapshots.
- The Btrfs section implied Docker's Btrfs storage driver makes named volumes directly snapshot-ready and showed creating a subvolume at Docker's internal `_data` path. Docker's Btrfs driver manages image and container layers, while named volumes are not automatically Btrfs subvolumes. Replaced the example with a Btrfs subvolume exposed through Docker's local bind-backed volume driver.
- The PostgreSQL consistency example used `pg_backup_start()` and `pg_backup_stop()` as if they paused writes. PostgreSQL documents these as low-level backup API functions used with WAL archiving, not as write-pause commands. Replaced the example with a maintenance-window stop/snapshot/start flow.
- The method comparison table overstated consistency guarantees for tar, LVM, Btrfs, and ZFS snapshots. Updated it to distinguish crash consistency from application consistency and to note that quiescing is required for application-consistent snapshots.
- The Btrfs section described snapshots as "zero-cost." Adjusted this to "space-efficient" because copy-on-write snapshots still consume metadata initially and additional space as data changes.

## Review Notes
The remaining examples are technically plausible but assume the host paths, volume groups, ZFS pools, and Btrfs filesystems already exist and are managed carefully. Filesystem snapshots are useful backup primitives, but production database backups should still be tested with restores and should use database-native tooling or WAL-aware procedures when online consistency is required.
