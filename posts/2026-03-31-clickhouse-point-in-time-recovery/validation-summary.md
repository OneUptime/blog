# Validation Summary: How to Perform a Point-in-Time Recovery in ClickHouse

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (BACKUP/RESTORE, ALTER TABLE FREEZE/UNFREEZE, partition manipulation, replication)
- AWS S3 (as backup storage destination)
- ClickHouse system tables (system.parts, system.replicas, system.tables)

## Sources Consulted
- ClickHouse BACKUP/RESTORE documentation: https://clickhouse.com/docs/operations/backup
- ClickHouse S3 backup endpoint docs: https://clickhouse.com/docs/operations/backup/s3_endpoint
- ClickHouse partition manipulation docs: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse EXCHANGE statement docs: https://clickhouse.com/docs/sql-reference/statements/exchange
- ClickHouse SYSTEM statements docs: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse system tables reference: https://clickhouse.com/docs/operations/system-tables
- ClickHouse GitHub issue #8183 (attach all detached partitions): https://github.com/ClickHouse/ClickHouse/issues/8183

## Issues Found

1. **Intro table listed three methods but four were covered.** The table under "Understanding the PITR Options" said "three PITR mechanisms" but Method 4 (Replication Lag) was also covered. Fixed by changing to "four" and adding a row for replication lag exploitation.

2. **`system.freeze_snapshots` does not exist.** The post referenced `SELECT * FROM system.freeze_snapshots` to list frozen snapshots, but this system table does not exist in ClickHouse. Replaced with a filesystem listing of `/var/lib/clickhouse/shadow/`, which is the standard approach.

3. **`ALTER TABLE ... ATTACH PARTITION ID 'all'` is invalid syntax.** ClickHouse has no syntax for attaching all detached parts in a single command. Replaced with a bash loop that iterates through the detached directory and attaches each part individually using `ALTER TABLE ... ATTACH PART`.

4. **Incorrect reference to `system.create_table_query`.** A comment referenced `system.create_table_query` as if it were a system table. The CREATE TABLE statement is actually stored in the `create_table_query` column of the `system.tables` table. Fixed the comment.

5. **Mixed SQL and bash in a single code block.** Method 4's code block was tagged as SQL but contained a `clickhouse-client` shell command in the middle. Split into separate SQL and bash code blocks for clarity.

6. **Missing `chown` after `sudo cp` in freeze restore.** After copying frozen parts with `sudo cp -r`, the files would be owned by root and unreadable by the ClickHouse process. Added a `sudo chown -R clickhouse:clickhouse` step to fix file ownership.

## Review Notes
- The incremental backup restore approach (Method 1) manually restores the base and then each incremental with `allow_non_empty_tables = true`. While this works, the more idiomatic ClickHouse approach is to RESTORE from the latest incremental backup, which automatically resolves the chain back to the base via the `base_backup` metadata. The blog's approach is not wrong but is non-standard.
- `SYSTEM STOP REPLICATION QUEUES` without a table name (Method 4) stops all replication queues globally, which is a drastic action. In practice, specifying the target table is safer.
- `MOVE PARTITION ... TO TABLE` (Method 2) has restrictions with ReplicatedMergeTree tables — both tables must share the same replication path structure. The blog does not specify the engine, which is fine for a general guide but worth noting.
- The `EXCHANGE TABLES` statement requires the Atomic database engine (the default since ClickHouse 20.5+), so this should work in any modern deployment.
