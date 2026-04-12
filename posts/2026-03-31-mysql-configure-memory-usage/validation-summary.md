# Validation Summary: How to Configure MySQL Memory Usage

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- MySQL Performance Schema
- MySQL configuration (my.cnf / mysqld options)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool Configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html)
- MySQL 8.0 Reference Manual: Server System Variables (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html)
- MySQL 8.0 Reference Manual: Performance Schema Memory Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html)
- MySQL 8.0 Reference Manual: Online Buffer Pool Resizing (https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-resize.html)

## Issues Found
- **Incorrect column name in performance_schema query**: The query used `ORDER BY current_alloc DESC` but the `performance_schema.memory_summary_global_by_event_name` table does not have a `current_alloc` column. The correct column name is `CURRENT_NUMBER_OF_BYTES_USED`. The `current_alloc` column exists in the `sys.memory_global_by_current_bytes` view, not in the raw performance_schema table. Fixed the column name in the query.

## Review Notes
- Online buffer pool resizing was actually introduced in MySQL 5.7.5, not MySQL 8.0. The post states "MySQL 8.0 supports online buffer pool resizing" which is technically accurate (8.0 does support it) but may imply it was introduced in 8.0.
- The `innodb_buffer_pool_instances` variable was deprecated in MySQL 8.0.40 and removed in MySQL 9.1. The advice is correct for MySQL 8.0 but readers on newer versions should be aware of this change.
- The memory formula mentions "query cache remnants" in the overhead category. The query cache was fully removed in MySQL 8.0, so this phrasing could be confusing. However, it is in a parenthetical overhead note and not a material error.
- The 8589934592 bytes calculation for 8GB is correct (8 * 1024^3 = 8,589,934,592).
- The 200 connections * 4MB = 800MB calculation is correct.
