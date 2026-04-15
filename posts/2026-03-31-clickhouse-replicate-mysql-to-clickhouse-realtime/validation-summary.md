# Validation Summary: How to Replicate Data from MySQL to ClickHouse in Real-Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MaterializedMySQL database engine)
- MySQL (binlog replication, GTID)
- ReplacingMergeTree (internal engine used by MaterializedMySQL)
- Change Data Capture (CDC)

## Sources Consulted
- ClickHouse official documentation: MaterializedMySQL database engine — https://clickhouse.com/docs/en/engines/database-engines/materialized-mysql
- ClickHouse official documentation: ReplacingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- MySQL 8.0 Reference Manual: Binary Logging Options — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- Percona Blog: Complete Walkthrough MySQL to ClickHouse Replication Using MaterializedMySQL Engine — https://www.percona.com/blog/complete-walkthrough-mysql-to-clickhouse-replication-using-materializedmysql-engine/
- ClickHouse GitHub Issue #35119: materialized_mysql_tables_list support — https://github.com/ClickHouse/ClickHouse/issues/35119

## Issues Found

1. **Missing GTID configuration in MySQL prerequisites**: MaterializedMySQL requires GTID-based replication. The my.cnf example was missing `gtid_mode = ON` and `enforce_gtid_consistency = ON`. Added both settings to the configuration block.

2. **Deprecated `expire_logs_days` setting**: `expire_logs_days` was deprecated in MySQL 8.0 and removed in MySQL 8.2.0. Replaced with `binlog_expire_logs_seconds = 604800` (equivalent to 7 days).

3. **Incorrect code block language for my.cnf**: The MySQL configuration file was in a ````sql` code block with a SQL-style comment (`-- my.cnf`), but my.cnf uses INI format. Changed to ````ini` and removed the invalid comment.

4. **Incorrect setting name `include_tables`**: The setting for filtering specific tables in MaterializedMySQL is `materialized_mysql_tables_list`, not `include_tables`. Changed to the correct setting name.

5. **Deprecated `SHOW SLAVE STATUS` command**: `SHOW SLAVE STATUS` was deprecated in MySQL 8.0.22 in favor of `SHOW REPLICA STATUS`. Updated to the current syntax.

## Review Notes
- The MaterializedMySQL engine has been marked as experimental for a long time and there are indications it may be removed or deprecated in newer ClickHouse versions (post-24.x). Readers should verify availability in their target ClickHouse version. ClickPipes is the recommended alternative for managed ClickHouse Cloud deployments.
- The blog correctly notes that `FINAL` is needed for accurate query results. In ClickHouse 22.8+, FINAL is automatically applied to MaterializedMySQL queries, making explicit use redundant but not harmful.
- DDL support is described as handling "most" changes which is a reasonable qualifier. However, DROP COLUMN and operations that shift column positions can cause replication errors. The blog's phrasing is acceptable but readers should be aware of these limitations.
- The `_sign = -1` delete marking is correct, but readers should know that deleted rows are not physically removed — they remain in storage and are filtered at query time.
- The `RELOAD` privilege may also be needed on the MySQL user for the initial table snapshot (`FLUSH TABLES`), depending on the MySQL version and configuration.
