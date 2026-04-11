# Validation Summary: How to Set Up MySQL Multi-Source Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (multi-source replication)
- GTID-based and position-based replication
- MySQL Performance Schema (replication monitoring tables)
- MySQL replication filters

## Sources Consulted
- MySQL 8.0 Reference Manual: Multi-Source Replication (https://dev.mysql.com/doc/refman/8.0/en/replication-multi-source.html)
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO (https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html)
- MySQL 8.0 Reference Manual: replication_applier_status_by_coordinator table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-coordinator-table.html)
- MySQL 8.0 Reference Manual: SHOW MASTER STATUS (https://dev.mysql.com/doc/refman/8.0/en/show-master-status.html)
- MySQL 8.0 Reference Manual: Replication and Binary Logging System Variables (https://dev.mysql.com/doc/refman/8.0/en/replication-options.html)

## Issues Found
1. **Prerequisites stated MySQL 5.7.6+ but syntax requires MySQL 8.0.23+**: The post uses `CHANGE REPLICATION SOURCE TO` (introduced in 8.0.23), `START REPLICA`/`STOP REPLICA`/`SHOW REPLICA STATUS` (8.0.22+), and `replica_*` system variable names (8.0.26+). Updated the prerequisite to say "MySQL 8.0.23+" with a note that multi-source replication has been available since 5.7.6.
2. **`SHOW BINARY LOG STATUS` requires MySQL 8.2.0+**: This command was introduced in MySQL 8.2.0 as a replacement for `SHOW MASTER STATUS`. Since the rest of the post targets MySQL 8.0.23+, changed to `SHOW MASTER STATUS` for compatibility with the MySQL 8.0 LTS series.
3. **Incorrect Performance Schema column name**: The query on `performance_schema.replication_applier_status_by_coordinator` referenced `LAST_APPLIED_TRANSACTION`, which does not exist. The correct column name is `LAST_PROCESSED_TRANSACTION`. Fixed the column name.

## Review Notes
- The post consistently uses the modern MySQL 8.0+ terminology (`replica` instead of `slave`, `source` instead of `master`), which is appropriate for current usage. Users on MySQL 5.7 or early 8.0 releases would need to substitute the legacy syntax (`CHANGE MASTER TO`, `START SLAVE`, `slave_parallel_workers`, etc.).
- The `replica_*` system variable names (used in `my.cnf` snippets) specifically require MySQL 8.0.26+ where they were introduced as aliases. Users on 8.0.23-8.0.25 would need the older `slave_*` names for the config file but can still use `CHANGE REPLICATION SOURCE TO` in SQL.
- The `caching_sha2_password` authentication plugin is the default in MySQL 8.0+. Users on 5.7 would need `mysql_native_password` instead.
- The `FLUSH PRIVILEGES` after `GRANT` is unnecessary in MySQL 8.0+ (it is automatically applied), but including it is harmless and a common practice.
