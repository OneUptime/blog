# Validation Summary: How to Troubleshoot Slow MySQL Queries

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- MySQL 8.0+
- MySQL Slow Query Log
- mysqldumpslow CLI utility
- EXPLAIN and EXPLAIN ANALYZE
- Performance Schema
- InnoDB lock diagnostics

## Sources Consulted
- MySQL 8.0 Reference Manual: Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: EXPLAIN ANALYZE (added in 8.0.18) — https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze
- MySQL 8.0 Reference Manual: mysqldumpslow — https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html
- MySQL 8.0 Reference Manual: Performance Schema table_io_waits_summary_by_table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-table-table.html
- MySQL 8.0 Reference Manual: data_lock_waits table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Migration Guide: Removal of InnoDB INFORMATION_SCHEMA lock tables — https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html

## Issues Found

1. **Step 6 — Lock wait query used removed MySQL 5.7 tables (breaking error)**
   - **What was wrong:** The query joined `information_schema.innodb_lock_waits` using columns `requesting_trx_id` and `blocking_trx_id`. These tables (`INNODB_LOCK_WAITS` and `INNODB_LOCKS`) were removed in MySQL 8.0. Since the post already relies on MySQL 8 features (EXPLAIN ANALYZE requires 8.0.18+), this query would fail with a "table doesn't exist" error.
   - **What was changed:** Replaced `information_schema.innodb_lock_waits` with `performance_schema.data_lock_waits` and updated the join columns from `requesting_trx_id`/`blocking_trx_id` to `REQUESTING_ENGINE_TRANSACTION_ID`/`BLOCKING_ENGINE_TRANSACTION_ID`. The joins to `information_schema.innodb_trx` were kept as-is since that table still exists in MySQL 8.0.
   - **Why:** The post targets MySQL 8.0+ (evidenced by EXPLAIN ANALYZE and descending index syntax), so all queries must work on that version.

2. **Step 5 — Misleading SQL comment about full scans and session scope**
   - **What was wrong:** The comment said "Find tables with the most full scans in the current session" but `count_read` in `performance_schema.table_io_waits_summary_by_table` counts all read I/O wait events (index reads + full scans), not just full scans. The data is also accumulated since server start or the last `TRUNCATE` of the summary table, not scoped to the current session.
   - **What was changed:** Updated the comment to "Find tables with the most read I/O since last reset" which accurately describes what the query returns.
   - **Why:** Misleading comments can lead readers to draw incorrect conclusions from the query output.

## Review Notes
- EXPLAIN ANALYZE was introduced in MySQL 8.0.18 specifically. The post says "MySQL 8" which is acceptable but readers on 8.0.0–8.0.17 won't have it available.
- Descending indexes (`created_at DESC` in the composite index) require MySQL 8.0.1+. In MySQL 5.7, the `DESC` keyword is parsed but silently ignored. This is consistent with the post's MySQL 8 target.
- The summary states slow queries "can be fixed without schema changes" — adding indexes is technically a DDL/schema change, though colloquially it's understood to mean the table structure (columns) doesn't need to change. This is a minor wording nuance, not a technical error.
- `performance_schema` must be enabled (it is by default in MySQL 8.0) for the Step 5 query to work. This is not mentioned but is a reasonable assumption for most installations.
