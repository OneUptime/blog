# Validation Summary: How to Tune sort_buffer_size for MySQL

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL (sort_buffer_size system variable)
- MySQL Performance Schema
- MySQL EXPLAIN output
- MySQL configuration (my.cnf / my.ini)

## Sources Consulted
- MySQL 8.0 Reference Manual: sort_buffer_size system variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_sort_buffer_size)
- MySQL 8.0 Reference Manual: Server Status Variables - Sort_merge_passes (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html#statvar_Sort_merge_passes)
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Timer representation (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)
- MySQL 8.0 Reference Manual: ORDER BY Optimization (https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html)

## Issues Found
- **Performance Schema timer conversion error**: The query in "Identifying Queries that Benefit from Larger Buffers" divided `AVG_TIMER_WAIT` by `1000000000` (10^9) and labeled the result `avg_latency_sec`. In MySQL's Performance Schema, timer values are stored in picoseconds (10^-12 seconds). Dividing by 10^9 yields milliseconds, not seconds. Fixed the divisor to `1000000000000` (10^12) to correctly produce seconds.

## Review Notes
- The default sort_buffer_size of 256 KB is correct for MySQL 8.0. Earlier versions (5.7 and below) also used 256 KB (262144 bytes) as the default.
- Starting with MySQL 8.0.12, the sort buffer is allocated incrementally rather than all at once, which means the worst-case memory calculation in the post is conservative. The post does note that "real usage is typically much lower," which is fair.
- All SQL syntax, SHOW commands, SET GLOBAL/SESSION statements, and configuration file format are correct.
- The advice to add indexes as a long-term fix over increasing sort_buffer_size is sound and aligns with MySQL best practices.
