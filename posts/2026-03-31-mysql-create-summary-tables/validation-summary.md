# Validation Summary: How to Create Summary Tables in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL Event Scheduler
- SQL aggregation functions (SUM, COUNT, AVG)
- INSERT ... ON DUPLICATE KEY UPDATE pattern

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: Event Scheduler Configuration — https://dev.mysql.com/doc/refman/8.0/en/events-configuration.html
- MySQL 8.0 Reference Manual: DATE_FORMAT Function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
- MySQL 8.0 Reference Manual: MySQL Handling of GROUP BY — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html

## Issues Found
No technical issues found.

## Review Notes
- The `VALUES()` function used in `ON DUPLICATE KEY UPDATE` clauses was deprecated in MySQL 8.0.20 (April 2020). The recommended replacement uses row and column aliases (e.g., `INSERT INTO t (a, b) VALUES (1, 2) AS new ON DUPLICATE KEY UPDATE b = new.b`). Since the post does not target a specific MySQL version and `VALUES()` remains functional (not yet removed), this is not treated as an error, but readers using MySQL 8.0.20+ will see deprecation warnings in their logs.
- The use of column aliases in `GROUP BY` (e.g., `GROUP BY month, region`) is a MySQL-specific extension to standard SQL. This is valid but not portable to other databases.
- The composite primary key on `(summary_date, product_id, region)` with a `VARCHAR(50)` component is valid for InnoDB but worth noting for readers who may use very long region strings with multi-byte character sets — the combined key length must stay within InnoDB's 3072-byte limit (ROW_FORMAT=DYNAMIC).
