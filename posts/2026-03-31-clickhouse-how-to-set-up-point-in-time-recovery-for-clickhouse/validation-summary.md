# Validation Summary: How to Set Up Point-in-Time Recovery for ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (MergeTree engine, system tables, ALTER TABLE FREEZE/UNFREEZE, DROP PART)
- clickhouse-backup (Altinity) CLI
- AWS S3 (via aws CLI and as remote_storage target)
- Cron / Bash scheduling

## Sources Consulted
- ClickHouse ALTER PARTITION docs: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse SYSTEM statements docs: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse system.parts reference: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse system.replication_queue reference: https://clickhouse.com/docs/operations/system-tables/replication_queue
- Altinity clickhouse-backup README: https://github.com/Altinity/clickhouse-backup

## Issues Found
1. **Incorrect CLI subcommand name**: The post used `clickhouse-backup create-remote` (hyphen). The actual subcommand is `create_remote` (underscore). Fixed by replacing the hyphen with an underscore in the cron example.
2. **Non-existent column in `system.replication_queue`**: The post queried `entry` as a column name, but `system.replication_queue` has no `entry` column. Replaced with `new_part_name`, which is the closest informative column for GET_PART entries (and is present in the official schema).

## Review Notes
- `ALTER TABLE ... UNFREEZE WITH NAME ...` (without a PARTITION clause) is valid per the official grammar `ALTER TABLE table_name UNFREEZE [PARTITION 'part_expr'] WITH NAME 'backup_name'`. A cluster-wide alternative `SYSTEM UNFREEZE WITH NAME '<backup_name>'` also exists and could be mentioned as a future improvement for multi-table cleanup.
- `min_time` / `max_time` columns in `system.replication_queue`-adjacent queries assume a DateTime column participates in the partition key. For tables partitioned only on a Date, these fields may carry default values — worth noting if a reader's table uses Date-only partitioning.
- `ALTER TABLE ... DROP PART 'part_name'` is valid. The post correctly flags this as dangerous.
- The cron one-liner using `clickhouse-backup list remote | tail -1 | awk '{print $1}'` is a reasonable heuristic but depends on the `list` output ordering. Using the explicit `latest` keyword (`list remote latest`) is a more robust alternative for future revisions.
- ClickHouse itself does not ship a true WAL-based PITR; the post correctly frames the approach as an approximation built from incremental backups, FREEZE snapshots, and delayed replicas.
