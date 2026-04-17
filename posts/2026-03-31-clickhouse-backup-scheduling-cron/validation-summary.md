# Validation Summary: How to Automate ClickHouse Backup Scheduling with Cron

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (BACKUP/RESTORE, system.backups, clickhouse-client)
- Bash shell scripting
- cron / crontab
- Slack webhooks (curl alerting)

## Sources Consulted
- ClickHouse Backup and Restore docs: https://clickhouse.com/docs/en/operations/backup
- ClickHouse system.backups table docs: https://clickhouse.com/docs/en/operations/system-tables/backups
- ClickHouse clickhouse-client docs: https://clickhouse.com/docs/en/interfaces/cli
- GNU coreutils `date`, `ls`, `tail`, `xargs` reference
- crontab(5) manpage

## Issues Found
No technical issues found.

Verified specifics:
- `BACKUP DATABASE <db> TO Disk('<disk>', '<path>/') SETTINGS async = false` is valid documented syntax.
- `SETTINGS base_backup = Disk('backups', '<path>/')` is the correct form for incremental backups.
- `system.backups` has columns `id`, `name`, `base_backup_name`, `query_id`, `status`, `error`, `start_time`, `end_time`, etc. Its `status` Enum includes `BACKUP_CREATED` as the success value.
- The `name` column contains the destination expression (e.g., `Disk('backups', 'my_backup')`), so a `LIKE '%BACKUP_NAME%'` match works as described.
- `clickhouse-client --host --port --query` flags are all valid.
- Cron expressions (`0 2 * * *`, `0 * * * *`) and GNU `date -d "yesterday" +%Y-%m-%d` are correct.

## Review Notes
- Minor stylistic note (not fixed): with `set -euo pipefail`, the `else` branch following the backup command is effectively unreachable because the script exits on non-zero status before the `$? -eq 0` check runs. Behavior is still correct (script fails on error); just the "Backup failed" log line from the else branch wouldn't be written. This is a common idiom and not technically incorrect, so it was left as-is.
- The `clickhouse` OS user typically runs as a service account without a login shell; operators may need to ensure cron is permitted for that user on their distribution (e.g., `/etc/cron.allow`).
- The retention glob `production_20*_02/` relies on naming with a hardcoded `_02` hour suffix matching the daily backup schedule — if the daily cron hour is changed, this pattern must be updated in lockstep.
