# Validation Summary: How to Use BACKUP and RESTORE Commands in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (native BACKUP / RESTORE SQL commands)
- ClickHouse `system.backups` system table
- ClickHouse storage configuration (XML)
- S3 as a backup destination
- Local disk backups
- Azure Blob Storage / GCS (mentioned in summary)

## Sources Consulted
- [ClickHouse — Backup and restore](https://clickhouse.com/docs/operations/backup)
- [ClickHouse — system.backups](https://clickhouse.com/docs/en/operations/system-tables/backups)
- [ClickHouse source — `src/Backups/BackupSettings.h`](https://github.com/ClickHouse/ClickHouse/blob/master/src/Backups/BackupSettings.h)
- [ClickHouse 2022 changelog](https://github.com/ClickHouse/clickhouse-docs/blob/main/docs/whats-new/changelog/2022.md)
- [PR #21945 — Add new commands BACKUP and RESTORE (part 1)](https://github.com/ClickHouse/ClickHouse/pull/21945)

## Issues Found
1. **Incorrect introduction version.** The post stated that native BACKUP/RESTORE was introduced in version 22.4. The feature landed as experimental earlier (21.x) and became the stable/production-ready release in 22.8 (also what the sibling post `2026-01-21-clickhouse-backup-restore` references). Changed "version 22.4" to "version 22.8".
2. **Wrong column name in `system.backups` query.** The example selected `exception`, but the actual column is `error` (per the `system.backups` docs). Changed `exception` to `error`.
3. **Incorrect default for `compression_method`.** The settings table listed `lz4` as the default. Per `BackupSettings.h`, the default is an empty string (no compression). Changed the default cell to `none` and expanded the description to note `lz4` / `zstd` as common choices.

## Review Notes
- Basic BACKUP/RESTORE syntax, multi-table backups, PARTITIONS clause, RESTORE ... AS, S3 destination syntax, XML config (`storage_configuration` + `backups.allowed_disk` / `allowed_path`), and the `async` / `deduplicate_files` / `base_backup` / `compression_level` settings are all correct.
- The listed `system.backups` status values (`CREATING_BACKUP`, `BACKUP_CREATED`, `BACKUP_FAILED`, `RESTORING`, `RESTORED`, `RESTORE_FAILED`) are valid. Recent ClickHouse versions also expose `BACKUP_CANCELLED` and `RESTORE_CANCELLED` — not listed here but not incorrect to omit.
- The summary mentions GCS as a supported destination; in practice ClickHouse backs up to GCS via the `S3(...)` destination against the GCS S3-compatible endpoint rather than a dedicated GCS backup function. Azure Blob is supported via `AzureBlobStorage(...)`.
- Embedding S3 access keys directly in the `BACKUP ... TO S3(...)` call works but is not ideal for production — a named S3 disk with credentials in server config or named collections would be safer. Outside the scope of technical correctness.
