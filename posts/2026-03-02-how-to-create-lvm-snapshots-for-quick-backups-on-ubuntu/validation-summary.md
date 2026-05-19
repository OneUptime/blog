# Validation Summary: How to Create LVM Snapshots for Quick Backups on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- LVM2 logical volumes and copy-on-write snapshots
- PostgreSQL storage-level backups
- MySQL/MariaDB table locking for storage snapshots
- systemd service management
- cron scheduling
- Bash backup scripts

## Sources Consulted
- LVM `lvcreate(8)` manual: https://man7.org/linux/man-pages/man8/lvcreate.8.html
- LVM `lvs(8)` manual: https://man7.org/linux/man-pages/man8/lvs.8.html
- LVM `lvextend(8)` manual: https://man7.org/linux/man-pages/man8/lvextend.8.html
- LVM `lvm.conf(5)` manual: https://man7.org/linux/man-pages/man5/lvm.conf.5.html
- device-mapper `dmeventd(8)` manual: https://man7.org/linux/man-pages/man8/dmeventd.8.html
- PostgreSQL 18 documentation, File System Level Backup: https://www.postgresql.org/docs/current/backup-file.html
- PostgreSQL 18 documentation, Continuous Archiving and Point-in-Time Recovery: https://www.postgresql.org/docs/current/continuous-archiving.html
- MySQL 8.4 Reference Manual, FLUSH Statement: https://dev.mysql.com/doc/refman/8.4/en/flush.html
- MySQL 8.4 Reference Manual, mysql Client Commands: https://dev.mysql.com/doc/refman/8.4/en/mysql-commands.html

## Issues Found
- The PostgreSQL example used `pg_start_backup()` and `pg_stop_backup()`, which are outdated for supported PostgreSQL releases and do not match the current low-level backup API requirements. Replaced the snippet with `CHECKPOINT;` before the LVM snapshot and added a note that PostgreSQL will treat the restored snapshot as crash-consistent and replay WAL, with the full cluster and WAL included or snapshotted simultaneously.
- The MySQL/MariaDB split-session example used separate `mysql -e` commands for `FLUSH TABLES WITH READ LOCK`, snapshot creation, and `UNLOCK TABLES`. The global read lock is held by the client session, so the first command exits and releases the lock before the snapshot is created. Replaced it with examples that keep the lock, snapshot command, and unlock operation in one mysql client session.
- The full PostgreSQL backup script created the LVM snapshot without preparing PostgreSQL as described in the corrected guidance. Added a `CHECKPOINT;` before snapshot creation to reduce recovery work after restoring the snapshot.

## Review Notes
The LVM snapshot creation, percentage sizing, `lvs` monitoring fields, manual snapshot extension, auto-extension configuration names, `lvm2-monitor.service`, snapshot removal, cron examples, and read-only mounting flow are technically accurate. The post still assumes a simple layout where the relevant data, WAL, and any tablespaces are covered by the snapshot strategy; complex database layouts should document simultaneous snapshot requirements in more detail.
