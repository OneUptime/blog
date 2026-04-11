# Validation Summary: How to Troubleshoot MySQL High Latency

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- MySQL Performance Schema and sys schema
- Percona Toolkit (pt-query-digest)
- Node.js mysql driver (connection pooling)
- Linux system tools (iostat, vmstat, top, ping, tcptraceroute)

## Sources Consulted
- MySQL 8.0 Reference Manual — Slow Query Log: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual — performance_schema.data_lock_waits: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — information_schema.INNODB_LOCK_WAITS (removed): https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual — EXPLAIN ANALYZE: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual — sys.statement_analysis: https://dev.mysql.com/doc/refman/8.0/en/sys-statement-analysis.html
- MySQL 8.0 Reference Manual — InnoDB Buffer Pool: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- Linux man pages for iostat(1)

## Issues Found
1. **Lock waits query used removed MySQL 5.7 tables (Step 2):** The query referenced `information_schema.INNODB_LOCK_WAITS` with columns `requesting_trx_id` and `blocking_trx_id`. This table was removed in MySQL 8.0. Since the post targets MySQL 8.0+ (it uses `EXPLAIN ANALYZE` from 8.0.18+), this was updated to use `performance_schema.data_lock_waits` with the correct columns `REQUESTING_ENGINE_TRANSACTION_ID` and `BLOCKING_ENGINE_TRANSACTION_ID`.

2. **Incorrect iostat column name (Step 3):** The comment in the `iostat` example referenced `%await` as the column to check. The actual column name in `iostat -x` output is `await` (in milliseconds). The `%` prefix is used for the `%util` column. Fixed the comment to `await > 20 (ms)`.

## Review Notes
- The `sys.statement_analysis` column names (`query`, `exec_count`, `avg_latency`, `rows_examined_avg`) are all correct for MySQL 8.0.
- The `EXPLAIN ANALYZE` version note (MySQL 8.0.18+) is accurate.
- The `tcptraceroute` tool referenced in Step 6 is not installed by default on most Linux distributions and may need to be installed separately, but the usage shown is correct.
- The Node.js connection pool example uses the `mysql` npm package API correctly (`createPool` with `connectionLimit`).
