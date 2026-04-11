# Validation Summary: How to Troubleshoot MySQL Replication Lag

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL 8.0 (replication subsystem)
- Performance Schema (replication_applier_status_by_worker, replication_applier_status_by_coordinator)
- Percona Toolkit (pt-online-schema-change)
- Linux monitoring tools (iostat, sar, nload, top)

## Sources Consulted
- MySQL 8.0 Reference Manual — Replication Options Reference: https://dev.mysql.com/doc/refman/8.0/en/replication-options-reference.html
- MySQL 8.0 Reference Manual — Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — Replication Applier Status by Worker Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.0 Reference Manual — Row Searches in Replication: https://dev.mysql.com/doc/refman/8.0/en/replication-features-row-searches.html
- MySQL 8.0.27 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-27.html
- MySQL 8.0.18 Release Notes (slave_rows_search_algorithms deprecation): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-18.html
- MySQL 8.0 Reference Manual — Replica Server Options and Variables: https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html

## Issues Found

1. **Non-existent variable `replica_rows_search_algorithms`** (Cause 3): The post used `replica_rows_search_algorithms` in both a `SHOW VARIABLES` query and a config file snippet. This variable does not exist in any MySQL version. The actual variable is `slave_rows_search_algorithms`, which was deprecated in MySQL 8.0.18 and removed in MySQL 8.4. It was never given a `replica_*` alias because it was already deprecated before the 8.0.26 terminology renaming. Fixed by replacing with the correct variable name `slave_rows_search_algorithms` and adding deprecation notes.

2. **Non-existent status variable `Binlog_bytes_written`** (Cause 4): The post used `SHOW STATUS LIKE 'Binlog_bytes_written'` but this status variable does not exist in MySQL — it is MariaDB-only. MySQL's `Binlog_*` status variables are limited to `Binlog_cache_disk_use`, `Binlog_cache_use`, `Binlog_stmt_cache_disk_use`, and `Binlog_stmt_cache_use`. Fixed by replacing with `SHOW BINARY LOGS;` which lists binary log files and their sizes.

3. **Outdated claim about single-threaded default** (Cause 1): The post stated "By default the replica applies events with a single SQL thread" without version qualification. This was only true for MySQL < 8.0.27. Starting with MySQL 8.0.27, `replica_parallel_workers` defaults to 4, `replica_parallel_type` defaults to `LOGICAL_CLOCK`, and `replica_preserve_commit_order` defaults to `ON`. Fixed by adding version context.

## Review Notes
- The post consistently uses MySQL 8.0.22+ syntax (`SHOW REPLICA STATUS`, `STOP REPLICA`, `replica_parallel_*`) which is appropriate for modern MySQL deployments.
- The `slave_rows_search_algorithms` config block was kept with a note limiting it to MySQL < 8.0.18, since on 8.0.18+ the optimal behavior (INDEX_SCAN,HASH_SCAN) is the default and the variable is deprecated.
- The stored procedure for batch deletes uses `IF ROW_COUNT() < 1000` which is a valid and commonly used pattern — it performs one extra iteration when the last batch has exactly 1000 rows, but this is harmless.
- The `sync_relay_log = 0` setting disables explicit fsync entirely (not just reduced frequency), but the comment "reduce relay log fsync frequency" is close enough and the accompanying `relay_log_recovery = ON` provides the appropriate crash safety net.
- All Performance Schema table and column references were verified as correct.
- The mermaid decision tree is logically sound and matches the troubleshooting flow described in the post.
