# Validation Summary: How to Implement a Materialized View in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB)
- SQL stored procedures
- MySQL Event Scheduler
- MySQL triggers
- INSERT ... ON DUPLICATE KEY UPDATE (upsert pattern)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — CREATE EVENT: https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual — CREATE TRIGGER: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — DELIMITER syntax: https://dev.mysql.com/doc/refman/8.0/en/stored-programs-defining.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — TRUNCATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html

## Issues Found
1. **Missing DELIMITER for trigger definition**: The `CREATE TRIGGER orders_after_status_update` block used a compound statement (BEGIN...END) with internal semicolons but was missing the `DELIMITER $$` / `DELIMITER ;` wrapper. Without this, the MySQL client interprets the first semicolon inside the BEGIN block as the end of the CREATE TRIGGER statement, causing a syntax error. The stored procedures earlier in the post correctly used DELIMITER, so this was an inconsistency. Fixed by adding `DELIMITER $$` before the trigger and `DELIMITER ;` after, and changing the closing `END;` to `END$$`.

## Review Notes
- The `INDEX idx_sale_date (sale_date)` on `mv_daily_sales` is technically redundant because `sale_date` is already the leftmost column of the composite primary key. InnoDB's clustered index already supports efficient lookups on `sale_date`. The extra index wastes storage and adds write overhead, but it is not incorrect — just unnecessary.
- The full refresh procedure uses TRUNCATE, which is a DDL operation that causes an implicit commit. This means the materialized view table will be briefly empty between the TRUNCATE and the completion of the subsequent INSERT. For production use, wrapping the refresh in a rename-swap pattern (populate a temp table, then atomically rename) would avoid this window of empty results. This is a design trade-off, not an error.
- The trigger only handles the UPDATE case (order status changing to 'completed'). It does not handle direct INSERTs with `status='completed'` or reversals (status changing from 'completed' back to another value). These are reasonable scope limitations for a tutorial but worth noting for production use.
