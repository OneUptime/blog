# Validation Summary: How to Automate ClickHouse Backups with Cron

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- ClickHouse (BACKUP / RESTORE, system.backups table, clickhouse-client)
- Bash shell scripting
- cron / crontab
- AWS S3 (aws s3 CLI, S3 URLs)
- Monitoring/alerting (Slack webhooks, mail)

## Sources Consulted
- ClickHouse Backup and Restore docs: https://clickhouse.com/docs/operations/backup
- ClickHouse system.backups table reference (columns: id, name, status, num_files, uncompressed_size, compressed_size, error, start_time, end_time)
- `date` manpage (GNU coreutils `-d` and BSD `-v`) for cross-platform date arithmetic
- `crontab(5)` manpage for schedule format (Sunday = 0, `1-6` ranges)
- ISO 8601 day-of-week: `date +%u` returns 1=Mon … 7=Sun

## Issues Found
1. **Incorrect restore-chain description.** The original text claimed "A point-in-time restore to any day requires restoring the full backup and applying at most 6 incrementals." Since every daily incremental uses the same Sunday full as its `base_backup` (not the prior day's incremental), each incremental is an independent delta from Sunday. Restoring any day requires only the full + that single day's incremental. Rewrote the sentence to reflect this.

2. **`base_backup` URL pointed to the wrong scope.** Each database is backed up to `.../YYYY-MM-DD-full/<db>/`, but the original `BASE_BACKUP_SETTING` referenced the parent folder `.../YYYY-MM-DD-full/` and was hoisted outside the per-database loop. ClickHouse requires `base_backup` to point to the exact same path used as the `TO` destination of the prior backup. Moved the `BASE_BACKUP_SETTING` construction inside the `for DB` loop and made the URL include `${DB}/`.

3. **Non-existent column `total_size` in `system.backups`.** The system table exposes `compressed_size` and `uncompressed_size`, not `total_size`. Replaced `formatReadableSize(total_size)` with `formatReadableSize(compressed_size)` in the monitoring query.

## Review Notes
- The `S3('<url>')` backup function typically also takes AWS credentials as additional arguments (`S3('<url>', '<access_key>', '<secret_key>')`). The post's single-argument form works only when the ClickHouse server has access via IAM instance profile, environment variables, or `named_collections`/config — worth keeping in mind but not a bug.
- `date '+%u'` returns 7 for Sunday (ISO 8601), matching the script's `DAY_OF_WEEK = "7"` check; the cron schedule `* * 0` uses Sunday = 0, which is also correct because cron accepts both 0 and 7 for Sunday.
- The cleanup script's string comparison `[[ "$backup_date" < "$CUTOFF_FULL" ]]` relies on ISO-8601 `YYYY-MM-DD` lexical ordering, which works correctly here.
- The per-DB `BACKUP DATABASE` strategy will fail for any database the `backup_user` does not have the `BACKUP` privilege on — a reasonable operational caveat but not incorrect content.
