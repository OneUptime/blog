# Validation Summary: How to Create a Materialized View Equivalent in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL (DDL, DML, triggers, stored procedures, events)
- Materialized view pattern via summary tables

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table.html)
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement (https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html)
- MySQL 8.0 Reference Manual: CREATE PROCEDURE Statement (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)
- MySQL 8.0 Reference Manual: CREATE EVENT Statement (https://dev.mysql.com/doc/refman/8.0/en/create-event.html)
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE (https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html)
- MySQL 8.0 Reference Manual: Event Scheduler (https://dev.mysql.com/doc/refman/8.0/en/event-scheduler.html)

## Issues Found
No technical issues found.

## Review Notes
- The `VALUES()` function used in `ON DUPLICATE KEY UPDATE` clauses was deprecated in MySQL 8.0.20 (April 2020) in favor of row and column alias syntax. The code still works correctly in all current MySQL versions, but a future MySQL release may remove `VALUES()` support. The modern replacement syntax uses `AS new_row(col1, col2, ...)` aliases. This is a minor deprecation notice, not a functional error.
- The `DEFAULT (CURDATE())` expression default syntax requires MySQL 8.0.13+. The post does not specify a minimum version, but since MySQL 8.0 is the current GA series this is reasonable.
- The expected query output was verified against the sample data and is correct: Alice has 2 completed orders totaling $430, Bob has 1 completed order at $320 (his cancelled order is correctly excluded), and Carol has 0 completed orders.
- The trigger-to-stored-procedure pattern is valid in MySQL. The procedure modifies a different table than the trigger source, avoiding circular reference issues.
- The full refresh event does not handle removal of stale rows for customers deleted from the `customers` table. This is a minor design consideration, not an error in the presented code.
