# Validation Summary: Why the MySQL Slow Query Log Is Not a Live Lock-Wait Trace-and What to Collect from Performance Schema Instead

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- MySQL 8.0 and 8.4
- MySQL slow query log
- MySQL Performance Schema statement, stage, wait, and lock instrumentation
- MySQL `sys` schema lock-wait views
- InnoDB data and row locking
- MySQL metadata locking

## Sources Consulted

- [MySQL 8.4 Reference Manual: The Slow Query Log](https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html)
- [MySQL 8.0.28 Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-28.html)
- [Official MySQL server commit for Bug #33236909](https://github.com/mysql/mysql-server/commit/3e7f875a8e3068c8d5b55f6ca566629f3e302a54)
- [Official MySQL 8.0.27 source for slow-query qualification](https://github.com/mysql/mysql-server/blob/mysql-8.0.27/sql/sql_class.cc#L2930-L2933)
- [Official MySQL 8.0.27 source for storage-engine lock-wait accounting](https://github.com/mysql/mysql-server/blob/mysql-8.0.27/sql/sql_thd_api.cc#L356-L360)
- [Official MySQL 8.4 source for current slow-query qualification](https://github.com/mysql/mysql-server/blob/mysql-8.4.11/sql/sql_class.cc#L3285-L3288)
- [MySQL 8.4 Reference Manual: Server System Variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [MySQL 8.4 Reference Manual: Performance Schema Consumer Configurations](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-consumer-configurations.html)
- [MySQL 8.4 Reference Manual: Statement Event Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-current-table.html)
- [MySQL 8.4 Reference Manual: `events_statements_history`](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-history-table.html)
- [MySQL 8.4 Reference Manual: `events_statements_history_long`](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-history-long-table.html)
- [MySQL 8.4 Reference Manual: Performance Schema System Variables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-system-variables.html)
- [MySQL 8.4 Reference Manual: Wait Event Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-wait-tables.html)
- [MySQL 8.4 Reference Manual: Stage Event Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-stage-tables.html)
- [MySQL 8.4 Reference Manual: `setup_instruments`](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-setup-instruments-table.html)
- [MySQL 8.4 Reference Manual: Pre-Filtering by Instrument](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-instrument-filtering.html)
- [MySQL 8.4 Reference Manual: Performance Schema Lock Tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-lock-tables.html)
- [MySQL 8.4 Reference Manual: `sys.innodb_lock_waits`](https://dev.mysql.com/doc/refman/8.4/en/sys-innodb-lock-waits.html)
- [Official MySQL 8.4 source for `sys.innodb_lock_waits`](https://github.com/mysql/mysql-server/blob/mysql-8.4.11/scripts/sys_schema/views/p_s/innodb_lock_waits.sql)
- [MySQL 8.4 Reference Manual: `sys.schema_table_lock_waits`](https://dev.mysql.com/doc/refman/8.4/en/sys-schema-table-lock-waits.html)
- [Official MySQL 8.4 source for `sys.schema_table_lock_waits`](https://github.com/mysql/mysql-server/blob/mysql-8.4.11/scripts/sys_schema/views/p_s/schema_table_lock_waits.sql)

## Issues Found

- The post said slow-log order is completion order. MySQL writes slow-log entries after statement execution, but concurrent statements can reach the serialized logger without a strict completion-order guarantee. The wording now says entries are completion-oriented and that log order can differ from statement start order.
- The settings discussion could imply that global `long_query_time` and `min_examined_row_limit` values govern existing connections. Both variables also have session scope, and existing sessions can retain or set different values. The post now identifies the displayed values as active global values and adds the session-scope caveat.
- The version comparison mentioned only initial table-lock acquisition. In MySQL 8.0.27, storage-engine-reported lock-wait duration was also added to the post-lock timestamp used for slow-query qualification, effectively excluding that duration as well. The introduction and conclusion now describe both excluded components and the 8.0.28 switch to statement-start timing.

## Review Notes

- The MySQL 8.4 slow-query-log manual still says initial-lock acquisition is excluded, but the MySQL 8.0.28 fix and current server source compare elapsed time with `start_utime`; the post correctly calls out this documentation discrepancy.
- The MySQL 8.4 manual's column list for `sys.innodb_lock_waits` omits `locked_table`, but official MySQL 8.0.27, 8.0.28, and 8.4 server source defines that column. The post's query is valid for the versions discussed.
- `waiting_lock_duration` and `blocking_lock_duration` in `sys.schema_table_lock_waits` describe metadata-lock scope (`STATEMENT`, `TRANSACTION`, or `EXPLICIT`), not elapsed time. The post does not misstate those columns and correctly orders by `waiting_query_secs` for elapsed age.
- `TIMER_END IS NOT NULL` is redundant for timed rows in `events_statements_history_long`, because that table contains ended events, but it harmlessly excludes untimed rows whose timer columns are `NULL`.
- The global-settings query is valid but intentionally not exhaustive. In particular, `log_output = 'NONE'` prevents entries even when `slow_query_log` is enabled, and throttling, administrative-statement, and replication logging variables can further change coverage.
- Most instruments can be configured at runtime, but MySQL documents startup-only behavior for some mutex, condition, and read-write-lock instances that already exist when configuration changes.
- All ten external links in the post resolved successfully during validation.
