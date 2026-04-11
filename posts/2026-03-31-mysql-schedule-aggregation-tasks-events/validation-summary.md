# Validation Summary: How to Schedule Aggregation Tasks with MySQL Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Event Scheduler (`CREATE EVENT`, `ON SCHEDULE`)
- MySQL aggregation functions (`SUM`, `COUNT`, `AVG`, `COUNT(DISTINCT ...)`)
- `INSERT ... SELECT ... ON DUPLICATE KEY UPDATE` pattern
- `RENAME TABLE` atomic swap pattern
- `TRUNCATE TABLE` for rebuild strategies

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE EVENT Statement: https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — Date and Time Functions (NOW, CURDATE, DATE_FORMAT, INTERVAL): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual — RENAME TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/rename-table.html
- MySQL 8.0 Reference Manual — TRUNCATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html

## Issues Found
- **Example 2 — WHERE clause / stat_hour mismatch**: The `stat_hour` was computed as `NOW() - INTERVAL 1 HOUR` (truncated to the hour), but the WHERE clause filtered data from `NOW() - INTERVAL 2 HOUR` to `NOW() - INTERVAL 1 HOUR`, which is one hour earlier than what `stat_hour` represents. For example, if the event fires at 3:00 PM, `stat_hour` would be `14:00:00` (the 2 PM hour) but the WHERE clause counted activity from 1:00 PM to 2:00 PM (the 1 PM hour). Fixed the WHERE clause to `activity_time >= NOW() - INTERVAL 1 HOUR AND activity_time < NOW()` so the data range matches the `stat_hour` label.

## Review Notes
- The `VALUES()` function used in `ON DUPLICATE KEY UPDATE` was deprecated in MySQL 8.0.20. The recommended replacement is the row/column alias syntax (e.g., `INSERT INTO t1 (...) VALUES (...) AS new ON DUPLICATE KEY UPDATE col = new.col`). The code still works but readers targeting MySQL 8.0.20+ should be aware of the deprecation.
- The post does not mention that the MySQL Event Scheduler must be enabled (`SET GLOBAL event_scheduler = ON;`) for events to execute. This is off by default in many installations and is an important prerequisite for readers following this tutorial.
- In Example 1, `WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY` applies a function to the column, which prevents index usage on `created_at` (not sargable). A range condition like `WHERE created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE()` would be more efficient, though this is a performance consideration rather than a correctness issue.
