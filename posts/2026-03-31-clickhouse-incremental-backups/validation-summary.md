# Validation Summary: How to Set Up Incremental Backups in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (BACKUP / RESTORE commands)
- ClickHouse storage configuration (`storage_configuration`, `disks`, `backups` XML settings)
- ClickHouse `system.backups` system table
- Bash scripting (`clickhouse-client`, `date`)

## Sources Consulted
- ClickHouse Backup and Restore documentation: https://clickhouse.com/docs/operations/backup
- ClickHouse Backup/Restore with local disk: https://clickhouse.com/docs/operations/backup/disk
- ClickHouse `system.backups` table reference: https://clickhouse.com/docs/operations/system-tables/backups

## Issues Found
No technical issues found.

Verifications performed:
- The XML structure for `storage_configuration` > `disks` > `<backups>` with `type=local` and the top-level `<backups>` section with `allowed_disk` and `allowed_path` matches the official ClickHouse local-disk backup configuration example.
- General `BACKUP | RESTORE` syntax with `TO|FROM Disk('<disk_name>', '<path>/')` and the optional `AS name_in_backup` rename clause matches the published grammar.
- `SETTINGS base_backup = Disk(...)` is the correct way to create incremental backups per the ClickHouse "Settings" table, which lists `base_backup` as "The destination of the base backup used for incremental backups."
- `system.backups` does contain the columns referenced in the verification query (`id`, `status`, `start_time`, `end_time`, `total_size`).
- Restoring from a chained incremental backup by pointing to the latest incremental is consistent with how ClickHouse resolves `base_backup` links during restore.

## Review Notes
- The example sets `<allowed_path>/</allowed_path>`, which permits backups/restores to any on-disk path via the `backups` disk. The ClickHouse docs' sample uses a tighter path (e.g., `/backups/`). This is a hardening recommendation, not a technical error — the configuration is still valid.
- Chaining incremental-on-incremental is functionally supported in ClickHouse (`base_backup` can point to another incremental). Operationally, longer chains increase restore coupling and failure surface — worth a future callout, but not incorrect.
- The post does not mention `system.backup_log`, which is useful for historical auditing of backup/restore operations. Not a defect; a potential follow-up enhancement.
