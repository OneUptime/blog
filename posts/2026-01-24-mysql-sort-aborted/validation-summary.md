# Validation Summary: How to Fix 'Sort Aborted' Query Errors in MySQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MySQL
- MySQL Performance Schema
- MySQL optimizer hints
- MySQL server system variables and status variables
- MySQL EXPLAIN and ORDER BY optimization

## Sources Consulted
- MySQL 8.4 Reference Manual: Server System Variables - https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html
- MySQL 8.4 Reference Manual: Server Status Variables - https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html
- MySQL 8.4 Reference Manual: Optimizer Hints - https://dev.mysql.com/doc/refman/8.4/en/optimizer-hints.html
- MySQL 8.4 Reference Manual: ORDER BY Optimization - https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html
- MySQL 8.4 Reference Manual: EXPLAIN Output Format - https://dev.mysql.com/doc/refman/8.4/en/explain-output.html
- MySQL 8.4 Reference Manual: Performance Schema events_statements_current Table - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-current-table.html
- MySQL 8.4 Reference Manual: Performance Schema processlist Table - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-processlist-table.html
- MySQL 5.7 Reference Manual: Options and Variables Added, Deprecated, or Removed in MySQL 5.7 - https://dev.mysql.com/doc/refman/5.7/en/added-deprecated-removed.html

## Issues Found
- The post described "sort buffer overflow" as the cause of disk sorting. Changed this to "sort buffer spills" and clarified that MySQL uses temporary files and merge passes for filesort when needed, while aborts can occur when temporary files cannot be written.
- The `sort_buffer_size` session example used an arithmetic expression. Changed it to the literal byte value `4194304` to keep the example unambiguous in MySQL sessions.
- The `my.cnf` configuration snippet was fenced as SQL and mixed with a SQL statement. Changed the config block to `ini`, used an INI-style comment, and left the `SHOW VARIABLES` command in a separate SQL block.
- The timeout section described `max_execution_time` as a general query timeout. Clarified that it is a SELECT execution timeout, matching MySQL's documented behavior.
- The Performance Schema query used `STATE` with `events_statements_current`, but that table does not have a `STATE` column. Changed the example to query `performance_schema.processlist`, which documents `STATE`, `INFO`, and `TIME`.
- The result-set reduction example said MySQL must sort all rows before applying `LIMIT`. Reworded it to say MySQL must examine matching rows and perform a filesort when no usable ordering index exists.
- The materialized-view-style example implied that `CREATE TABLE ... SELECT ... ORDER BY` stores rows in a guaranteed sorted order. Changed it to precompute the table and add an index on `created_at DESC`, which is the correct mechanism for supporting the sorted access pattern.

## Review Notes
The remaining examples are version-sensitive but technically valid for modern MySQL versions. Global system variable changes require appropriate administrative privileges, and production values for timeouts, sort buffers, and temp table limits should be tested under workload rather than copied directly from the examples.
