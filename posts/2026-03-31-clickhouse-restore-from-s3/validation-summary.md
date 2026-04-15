# Validation Summary: How to Restore ClickHouse from S3 Backup

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (BACKUP/RESTORE commands, system.backups table)
- AWS S3 (backup storage)
- AWS CLI (s3 ls, s3 cp)
- Bash scripting (disaster recovery automation, point-in-time restore)
- GNU coreutils (seq, date)

## Sources Consulted
- ClickHouse official documentation — BACKUP and RESTORE syntax: https://clickhouse.com/docs/en/operations/backup
- ClickHouse official documentation — system.backups table columns: https://clickhouse.com/docs/en/operations/system-tables/backups
- Previously validated blog post `clickhouse-rollback-upgrade` — confirmed `files_read` as the correct column name (not `num_processed_files`), and `RESTORE ASYNC` keyword syntax (not `SETTINGS async = true`)
- Previously validated blog post `clickhouse-backup-restore-commands` — confirmed status values: `CREATING_BACKUP`, `BACKUP_CREATED`, `BACKUP_FAILED`, `RESTORING`, `RESTORED`, `RESTORE_FAILED`
- Previously validated blog post `clickhouse-test-disaster-recovery` — confirmed `error` as the correct column name in `system.backups`
- GNU seq manual — argument order is `seq FIRST INCREMENT LAST`

## Issues Found

1. **Non-existent column `num_processed_files` in `system.backups`**: The monitoring query used `num_processed_files` which does not exist in the `system.backups` table. The correct column for tracking file-level restore progress is `files_read`. Fixed in both the column reference and the progress percentage calculation.

2. **Non-existent column `processed_size` in `system.backups`**: The monitoring query used `processed_size` which does not exist. The correct column is `bytes_read`. Fixed accordingly.

3. **Incorrect status value `'FAILED'` in `system.backups` filter**: The WHERE clause filtered on `'FAILED'`, but the actual status value for a failed restore operation is `'RESTORE_FAILED'`. Fixed the status filter.

4. **Invalid `SETTINGS async = true` syntax for RESTORE**: In ClickHouse, `ASYNC` is a keyword placed directly after `RESTORE` (e.g., `RESTORE ASYNC DATABASE ...`), not a `SETTINGS` parameter. The `SETTINGS async = true` form would produce a parsing error. Fixed in all three occurrences: the Asynchronous Restore section and both steps in the Disaster Recovery section. Where `allow_non_empty_tables` was also needed, it remains as a `SETTINGS` parameter while `ASYNC` moves to keyword position.

5. **Incorrect `seq` argument order in point-in-time restore script**: The bash script used `seq -f "%g" 0 $((diff)) 86400`, which `seq` interprets as `FIRST=0 INCREMENT=$((diff)) LAST=86400`. Since the increment (total seconds between dates) is much larger than the last value (86400), this would only output `0` and fail to iterate over dates. Fixed to `seq 0 86400 $((diff))` (FIRST=0, INCREMENT=86400, LAST=diff). Also removed the `-f "%g"` format specifier which can produce scientific notation for large numbers.

## Review Notes
- The point-in-time restore script uses `date -d` which is GNU date syntax (Linux only). macOS users would need `gdate` from coreutils. This is acceptable since ClickHouse servers typically run on Linux.
- The Disaster Recovery section shows a two-step approach (restore full backup, then apply incremental with `allow_non_empty_tables`). Technically, restoring just from the most recent incremental backup should be sufficient since ClickHouse automatically follows the `base_backup` chain. However, the two-step approach may be useful when incremental backups were taken independently or when the chain metadata is unavailable, so this is not incorrect — just an alternative approach.
- The `RESTORE DATABASE ... AS ...` syntax for renaming during restore, and the `RESTORE TABLE ... AS ...` syntax for table-level restore, are both correct.
- The `base_backup` setting shown in the incremental restore section is primarily a BACKUP-time setting. During RESTORE, ClickHouse reads the chain from backup metadata. The post's note about providing it "if the chain references multiple S3 paths" is a reasonable edge-case caveat.
