# Validation Summary: How to Back Up and Restore ClickHouse Databases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse native BACKUP and RESTORE commands
- Altinity clickhouse-backup
- S3-compatible object storage
- ClickHouse replication with ZooKeeper/Keeper
- File-level ClickHouse backups using ALTER TABLE FREEZE
- Cron-based backup automation

## Sources Consulted
- ClickHouse Backup and Restore overview: https://clickhouse.com/docs/operations/backup/overview
- ClickHouse BACKUP / RESTORE to disk: https://clickhouse.com/docs/operations/backup/disk
- ClickHouse BACKUP / RESTORE to S3 endpoint: https://clickhouse.com/docs/operations/backup/s3_endpoint
- ClickHouse Manipulating Partitions and Parts: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse system.backups table: https://clickhouse.com/docs/operations/system-tables/backups
- Altinity clickhouse-backup README and CLI/config reference: https://github.com/Altinity/clickhouse-backup
- Altinity clickhouse-backup latest release metadata: https://api.github.com/repos/Altinity/clickhouse-backup/releases/latest

## Issues Found
- The clickhouse-backup installation snippet used `sudo apt install clickhouse-backup`, which is not the documented upstream installation path unless a suitable package repository has already been configured. Changed it to installing a downloaded Debian package from the release assets.
- The clickhouse-backup config sample included `clickhouse.data_path`, which is not present in the current upstream config reference. Removed it so the example matches current configuration fields.
- The native ClickHouse `Disk('backups', ...)` example configured only `storage_configuration.disks`; ClickHouse also requires backup destinations to be allowed under the `<backups>` server config. Added `allowed_disk` and `allowed_path`.
- The file-level backup example did not save table metadata. Added a metadata copy step, consistent with ClickHouse documentation that `FREEZE` copies data only.
- The file-level restore example copied data directly into the active table directory and stopped/restarted ClickHouse. ClickHouse documentation restores frozen data by copying parts into the table's `detached` directory and attaching them without stopping the server. Updated the commands accordingly.
- The restore SQL used `ALTER TABLE events ATTACH PARTITION ID 'all'`, which is not the documented way to attach all detached partitions. Changed it to `ALTER TABLE events ATTACH PARTITION ALL`.
- The "Continuous WAL Archiving" heading was inaccurate for ClickHouse replicated tables. Renamed it to "Replication for High Availability" while keeping the original content.
- The verification section described `clickhouse-backup download` as a dry-run restore. The command downloads a backup; it does not perform a dry run. Updated the comment.
- The S3 encryption snippet used `general.encryption_key`, which is not the current clickhouse-backup S3 encryption configuration. Replaced it with the documented S3 server-side encryption fields.

## Review Notes
- Replication is useful for high availability, but it is not a substitute for backups because accidental deletes or bad writes can replicate. The post already treats replication as a separate strategy rather than the primary backup method.
- `system.backups` is useful for recent native BACKUP/RESTORE operations, but ClickHouse documents it as non-persistent across server restarts.
