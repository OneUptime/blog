# Validation Summary: How to Restore Single Tables from ClickHouse Backups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (BACKUP/RESTORE commands)
- ClickHouse system.backups table
- ClickHouse partition management

## Sources Consulted
- ClickHouse official documentation — BACKUP and RESTORE: https://clickhouse.com/docs/en/operations/backup
- ClickHouse official documentation — system.backups table: https://clickhouse.com/docs/en/operations/system-tables/backups
- ClickHouse official documentation — Settings: https://clickhouse.com/docs/en/operations/settings/settings

## Issues Found

### 1. AS clause reversed in RESTORE TABLE examples (three occurrences)
**What was wrong:** The blog used `RESTORE TABLE my_database.events AS my_database.events_recovered`, which would look for a table called `events_recovered` inside the backup and restore it as `events` locally. The intent was the opposite — to restore `events` from the backup into a new local table named `events_recovered`.

**What was changed:** Swapped the names so the local destination name comes first and the backup source name comes after AS, matching the documented syntax `RESTORE TABLE [db.]table_name [AS [db.]table_name_in_backup]`. Fixed in "Restoring to a Different Table Name", "Handling Table Already Exists" (Option 2), and "Monitoring Table Restore Progress" sections.

**Why:** The ClickHouse RESTORE syntax uses `table_name` for the local destination and `table_name_in_backup` for the name inside the backup. The blog had these reversed, which would cause the RESTORE to fail when the expected name doesn't exist in the backup.

### 2. ASYNC is a keyword, not a SETTINGS value
**What was wrong:** The blog used `SETTINGS async = true` at the end of the RESTORE command. The ClickHouse documentation defines `ASYNC` as a keyword placed directly after `RESTORE`, not as a setting.

**What was changed:** Replaced `SETTINGS async = true` with the `ASYNC` keyword in the correct position: `RESTORE ASYNC TABLE ...`.

**Why:** The official syntax is `BACKUP | RESTORE [ASYNC]`, with ASYNC as a keyword modifier. There is no documented `async` setting for backup/restore operations.

### 3. Incorrect column name in system.backups query
**What was wrong:** The query referenced `exception` as a column in `system.backups`.

**What was changed:** Changed `exception` to `error`, which is the actual column name in the system.backups table.

**Why:** The system.backups table uses the column name `error` (not `exception`) for storing error messages, as documented in the system tables reference.

## Review Notes
- The PARTITIONS syntax `PARTITIONS ('2026-03')` follows the documented `[PARTITION[S] partition_expr [,...]]` pattern. The exact format of partition expressions depends on the table's partitioning key, so the example is illustrative and correct in form.
- The basic RESTORE TABLE syntax (without AS) and multiple-table comma-separated syntax are both correct.
- The RENAME TABLE atomic swap pattern shown in "Handling Table Already Exists" is a well-known ClickHouse technique and is correctly demonstrated.
- The system.backups status values used (`RESTORING`, `RESTORED`, `RESTORE_FAILED`) are confirmed correct per the official documentation.
