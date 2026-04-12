# Validation Summary: How to Monitor InnoDB Contention Points in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.6/5.7 and 8.0+)
- InnoDB storage engine
- Performance Schema
- information_schema views (INNODB_TRX, INNODB_LOCK_WAITS, INNODB_BUFFER_POOL_STATS)

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Wait Event Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-wait-summary-tables.html
- MySQL 8.0 Reference Manual: events_waits_summary_global_by_event_name table columns — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-wait-summary-tables.html
- MySQL 8.0 Reference Manual: data_lock_waits table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: INNODB_BUFFER_POOL_STATS table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html
- MySQL 8.0 Reference Manual: INNODB_TRX table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 5.7 Reference Manual: INNODB_LOCK_WAITS table — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options (innodb_buffer_pool_instances, innodb_redo_log_capacity) — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html

## Issues Found

1. **Performance Schema mutex query used non-existent column `OBJECT_NAME`**: The `events_waits_summary_global_by_event_name` table does not have an `OBJECT_NAME` column. Changed to `EVENT_NAME`, which is the correct grouping column in this summary table.

2. **Row-level lock contention query (pre-8.0) was fundamentally incorrect**: The original query self-joined `INNODB_TRX` with the condition `r.trx_wait_started IS NOT NULL AND b.trx_id != r.trx_id`, which produces a cross product of all waiting transactions with all other transactions rather than identifying actual blocking relationships. Replaced with the correct approach using `information_schema.INNODB_LOCK_WAITS` to join on `requesting_trx_id` and `blocking_trx_id`. Also updated the introductory text to specify this is for MySQL 5.6/5.7.

3. **Row-level lock contention query (MySQL 8.0+) used non-existent columns**: `REQUESTING_QUERY` and `BLOCKING_QUERY` do not exist in `performance_schema.data_lock_waits`. Changed to `req.trx_query AS waiting_query` and `blk.trx_query AS blocking_query`, fetching the queries from the joined `INNODB_TRX` rows.

4. **Buffer Pool Stats query used non-existent columns**: `READ_REQUESTS` and `READS` do not exist in `information_schema.INNODB_BUFFER_POOL_STATS`. Changed to `NUMBER_PAGES_GET` (total buffer pool page requests) and `NUMBER_PAGES_READ` (pages read from disk), which are the correct column names.

5. **Redo Log query used non-existent columns `NAME` and `COUNT`**: The `events_waits_summary_global_by_event_name` table uses `EVENT_NAME` and `COUNT_STAR`, not `NAME` and `COUNT`. Fixed both column references and the WHERE clause.

## Review Notes
- The `innodb_buffer_pool_instances` parameter is deprecated as of MySQL 8.4. The post does not claim a specific version for this recommendation, and it remains valid for MySQL 8.0, so no change was made.
- The join between `INNODB_TRX.trx_id` (varchar) and `data_lock_waits.REQUESTING_ENGINE_TRANSACTION_ID` (bigint unsigned) relies on implicit type conversion. This works but is not ideal for production monitoring queries. No change was made since it is functionally correct.
- The `HIT_RATE` column in `INNODB_BUFFER_POOL_STATS` reports hits per 1000 page gets (not a percentage), so it is not directly comparable to the calculated `hit_pct` column. Both are kept since they provide complementary views.
