# Validation Summary: How to Back Up ClickHouse Dictionaries

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- ClickHouse (BACKUP / RESTORE statements, dictionaries)
- `clickhouse-client` CLI
- ClickHouse system tables (`system.backup_log`, `system.dictionaries`)
- Bash scripting

## Sources Consulted
- [ClickHouse `system.dictionaries` table](https://clickhouse.com/docs/operations/system-tables/dictionaries)
- [ClickHouse `system.backup_log` table](https://clickhouse.com/docs/operations/system-tables/backup_log)
- [ClickHouse Backup and Restore documentation](https://clickhouse.com/docs/operations/backup)
- [ClickHouse SHOW CREATE DICTIONARY syntax](https://clickhouse.com/docs/sql-reference/statements/show#show-create-dictionary)

## Issues Found

1. **Wrong system table name and incorrect columns in the backup verification query.** The post referenced `system.backups_log` with columns `backup_name` and `type`. The correct table is `system.backup_log` (singular), and it has no `backup_name` or `type` columns — entity types are not tracked there. Replaced the query with a working one that filters on the `name` column and reports `status`, `num_files`, and `total_size`.

2. **Non-existent column `create_table_query` on `system.dictionaries`.** The bash one-liner that built a bulk DDL export concatenated `create_table_query`, but `system.dictionaries` does not expose that column (the columns are `database`, `name`, `uuid`, `status`, `origin`, `type`, `key.*`, `attribute.*`, `bytes_allocated`, `query_count`, `hit_rate`, `found_rate`, `element_count`, `load_factor`, `source`, `lifetime_*`, `loading_*`, `last_successful_update_time`, `error_count`, `last_exception`, `comment`). Rewrote the export to iterate over `(database, name)` pairs and call `SHOW CREATE DICTIONARY` per dictionary, which is the supported way to obtain dictionary DDL.

## Review Notes
- `BACKUP DATABASE` does include dictionaries that live as database objects, so the post's central claim is correct.
- Status enum values cited (`LOADED`, `FAILED`) are valid; the full set also includes `NOT_LOADED`, `LOADING`, `FAILED_AND_RELOADING`, `LOADED_AND_RELOADING`, and `NOT_EXIST`, but the post's narrower mention is fine for the verification flow.
- `RESTORE DICTIONARY` and `SYSTEM RELOAD DICTIONARIES` syntax used in the post is correct.
- `Disk('backups', 'production_backup_2026-03-31/')` relies on the `backups` disk being configured in `storage_configuration`; readers may need to set this up first, but that is implicit in the broader ClickHouse backup workflow.
