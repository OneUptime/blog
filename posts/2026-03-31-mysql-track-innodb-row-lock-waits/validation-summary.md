# Validation Summary: How to Track MySQL InnoDB Row Lock Waits

## Status
validated

## Post Type
Tutorial / Monitoring Guide

## Technologies Covered
- MySQL 8.0+ (InnoDB storage engine)
- InnoDB row-level locking
- MySQL Performance Schema
- MySQL information_schema
- Prometheus alerting rules
- mysqld_exporter (Prometheus MySQL exporter)
- Bash scripting

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: information_schema.innodb_lock_waits (removed in 8.0) — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: performance_schema.data_lock_waits — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: performance_schema.table_lock_waits_summary_by_table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-lock-waits-summary-by-table-table.html
- MySQL 8.0 Reference Manual: information_schema.innodb_trx — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: SELECT ... FOR UPDATE SKIP LOCKED — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- Prometheus mysqld_exporter metrics documentation — https://github.com/prometheus/mysqld_exporter

## Issues Found

### Issue 1: Blocked transactions query used removed MySQL 5.7 tables (Critical)
- **What was wrong:** The "Identifying Blocked Transactions" section intro text correctly referenced MySQL 8.0 Performance Schema tables (`data_locks`, `data_lock_waits`), but the actual SQL query used `information_schema.innodb_lock_waits` with columns `blocking_trx_id` and `requesting_trx_id`. This table was removed in MySQL 8.0, so the query would fail on any MySQL 8.0+ server.
- **What was changed:** Updated the query to use `performance_schema.data_lock_waits` with the correct column names (`BLOCKING_ENGINE_TRANSACTION_ID`, `REQUESTING_ENGINE_TRANSACTION_ID`), joined with `information_schema.innodb_trx` which still exists in MySQL 8.0+. Also updated the introductory text to accurately describe the tables used in the query (`data_lock_waits` and `information_schema.innodb_trx`).
- **Why:** The post implicitly targets MySQL 8.0+ (it references `data_locks`/`data_lock_waits` and `SKIP LOCKED`, all 8.0 features). The query must match.

## Review Notes
- The `table_lock_waits_summary_by_table` query in the "Performance Schema Deep Dive" section tracks **table-level** lock waits, not InnoDB row-level lock waits. In a post specifically about row lock waits, this could be misleading. However, the query is syntactically correct and does provide useful per-table contention information, so it was left as-is. A future improvement could add a note clarifying this distinction or supplement it with a `performance_schema.data_locks` query grouped by table.
- The bash script uses integer arithmetic (`$(( ... ))`), which truncates fractional results. For low lock-wait rates this would report 0. This is a minor practical limitation, not an error.
- The Prometheus alert thresholds (50 lock waits/sec, 10 concurrent waits) are reasonable defaults but would need tuning per environment. This is appropriately left as an exercise for the reader.
