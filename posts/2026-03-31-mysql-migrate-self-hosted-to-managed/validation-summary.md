# Validation Summary: How to Migrate from Self-Hosted MySQL to a Managed Service

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MySQL (mysqldump, binary log replication, CHECKSUM TABLE)
- AWS Database Migration Service (DMS)
- AWS CLI (dms commands)
- SQL (information_schema queries)

## Sources Consulted
- MySQL 8.0 Reference Manual — mysqldump options: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — CHANGE REPLICATION SOURCE TO: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual — Replication statements (START REPLICA, SHOW REPLICA STATUS): https://dev.mysql.com/doc/refman/8.0/en/replication-statements-replica.html
- MySQL 8.4 Reference Manual — mysqldump source-data: https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- AWS CLI Reference — aws dms create-replication-instance: https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-instance.html
- AWS CLI Reference — aws dms create-endpoint: https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html

## Issues Found
1. **`--master-data` deprecated in favor of `--source-data`**: The mysqldump commands used `--master-data=2` and `--master-data=1`, which were deprecated in MySQL 8.0.26. Since the post already uses modern MySQL 8.0.22+ syntax elsewhere (`CHANGE REPLICATION SOURCE TO`, `START REPLICA`, `SHOW REPLICA STATUS`, `Seconds_Behind_Source`), updated both occurrences to `--source-data=2` and `--source-data=1` for consistency.
2. **Grep pattern and comment referenced legacy output**: The comment "The dump includes a CHANGE MASTER TO statement at the top" and `grep "CHANGE MASTER"` referenced the legacy mysqldump output format. Updated to `CHANGE REPLICATION SOURCE` to match the output produced by modern MySQL versions (8.4+) when using `--source-data=1`.

## Review Notes
- The `table_rows` column from `information_schema.TABLES` is an estimate for InnoDB tables, not an exact count. The post uses it for "Compare row counts" which is a reasonable approach for migration validation, but readers should be aware that for exact counts they would need `SELECT COUNT(*) FROM table_name` on each table.
- The `--set-gtid-purged=OFF` flag in the mysqldump command is appropriate when GTID-based replication is not being used for the migration. If the target managed service uses GTIDs, this flag may need to be adjusted.
- The AWS DMS section omits the `create-replication-task` step, which is needed to actually start the migration. This is acceptable as the section is illustrative rather than a complete walkthrough, but readers should consult AWS documentation for the full DMS workflow.
