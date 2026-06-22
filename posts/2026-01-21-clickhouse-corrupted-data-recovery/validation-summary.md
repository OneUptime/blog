# Validation Summary: How to Recover from Corrupted ClickHouse Data

## Status
validated

## Post Type
Technical troubleshooting and recovery guide

## Technologies Covered
- ClickHouse MergeTree and ReplicatedMergeTree tables
- ClickHouse system tables
- ClickHouse `CHECK TABLE`, `ALTER TABLE`, `SYSTEM`, `BACKUP`, and `RESTORE` statements
- Altinity `clickhouse-backup`
- Linux service and filesystem recovery commands

## Sources Consulted
- ClickHouse `CHECK TABLE` documentation: https://clickhouse.com/docs/sql-reference/statements/check-table
- ClickHouse partition and part manipulation documentation: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse `SYSTEM RESTORE REPLICA` documentation: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse backup and restore documentation: https://clickhouse.com/docs/operations/backup/overview
- ClickHouse backup/restore to disk documentation: https://clickhouse.com/docs/operations/backup/disk
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse `system.detached_parts` documentation: https://clickhouse.com/docs/operations/system-tables/detached_parts
- ClickHouse `system.replicas` documentation: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse `EXCHANGE` statement documentation: https://clickhouse.com/docs/sql-reference/statements/exchange
- ClickHouse replicated table recovery documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- Altinity `clickhouse-backup` manual: https://github.com/Altinity/clickhouse-backup/blob/master/Manual.md

## Issues Found
- Corrected the `CHECK TABLE` description. The post said it returns a number of parts checked; ClickHouse returns either a single `result` column by default or detailed `part_path`, `is_passed`, and `message` rows when `check_query_single_value_result = 0` is set.
- Replaced broken-part detection via `system.parts WHERE name LIKE '%broken%' OR active = 0`. Inactive parts are normal after merges and mutations; ClickHouse exposes detached problem parts through `system.detached_parts.reason`.
- Clarified `SYSTEM RESTORE REPLICA`. It restores replica metadata after Keeper/ZooKeeper metadata loss on read-only `ReplicatedMergeTree` tables; it is not a generic command to redownload an entire replica from healthy replicas.
- Replaced invalid `ALTER TABLE ... FETCH PARTITION ... FROM 'clickhouse://...'` syntax. Official ClickHouse `FETCH PARTITION|PART` expects a Keeper/ZooKeeper path, while built-in backups use `RESTORE ... FROM Disk(...)`, `S3(...)`, and similar backup sources.
- Replaced `clickhouse-local` examples that attempted to read raw part `.bin` files as `Native` and `checksums.txt` as `TSV`. These files are internal part files, so the guide now uses `CHECK TABLE ... PART` and `CHECK TABLE ... PARTITION ID`.
- Replaced the invalid checksum configuration snippet. ClickHouse part checksums are intrinsic to MergeTree parts; the listed settings were not documented checksum enablement settings. The post now recommends running `CHECK TABLE` during maintenance windows.
- Added the documented `force_restore_data` flag to the full-table replica recovery flow so ClickHouse can recover when many local parts differ from replica metadata after storage loss.
- Fixed backup maintenance shell examples to pass only backup names from `clickhouse-backup list` into `upload` and `delete local`.

## Review Notes
The examples remain illustrative and assume the reader substitutes the correct database, table, partition ID, backup name, and Keeper/ZooKeeper path for their deployment. Some manual filesystem recovery steps are inherently risky in production; official ClickHouse docs also caution that direct manipulation of data directories can cause data loss if used incorrectly.
