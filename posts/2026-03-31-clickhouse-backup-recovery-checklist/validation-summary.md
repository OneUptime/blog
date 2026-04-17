# Validation Summary: ClickHouse Backup and Recovery Checklist

## Status
validated

## Post Type
Checklist / Operations Guide

## Technologies Covered
- ClickHouse (built-in `BACKUP` / `RESTORE` SQL commands)
- Amazon S3 (backup destination)
- `system.backups` system table
- `clickhouse-backup` CLI tool (Altinity)

## Sources Consulted
- ClickHouse Backup and Restore docs: https://clickhouse.com/docs/en/operations/backup
- ClickHouse `system.backups` system table reference
- Altinity `clickhouse-backup` repo: https://github.com/Altinity/clickhouse-backup
- Altinity `clickhouse-backup` latest release assets (verified `clickhouse-backup-linux-amd64.tar.gz` exists): https://github.com/Altinity/clickhouse-backup/releases/latest

## Issues Found
- **clickhouse-backup download URL outdated.** The post linked to `github.com/AlexAkulov/clickhouse-backup`, but the project was transferred to the Altinity organization and the canonical URL is now `github.com/Altinity/clickhouse-backup`. Updated the `wget` command to the `Altinity` URL. The release asset name `clickhouse-backup-linux-amd64.tar.gz` and the `/releases/latest/download/` path pattern are still correct.

## Review Notes
- The `BACKUP DATABASE ... TO S3(...)` and `RESTORE ... FROM S3(...)` SQL syntax matches ClickHouse official documentation.
- The `SETTINGS base_backup = S3(...)` pattern for incremental backups is consistent with the documented `base_backup` setting (official docs show the `Disk(...)` example but the same engine-style argument works for S3 backup destinations).
- `system.backups` columns used (`id`, `status`, `error`, `start_time`, `end_time`, `uncompressed_size`, `compressed_size`) are all valid columns in that system table.
- The `clickhouse-backup` subcommands shown (`create`, `upload`, `list remote`, `download`, `restore`) are valid commands for the Altinity tool.
- Inline credentials in `BACKUP TO S3(...)` are fine for an example, but a future revision might recommend `named collections` or IAM role-based auth to avoid hardcoding keys.
