# Validation Summary: How to Denormalize a MySQL Database for Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, triggers, JSON functions)
- Denormalization patterns (redundant columns, precomputed aggregates, JSON flattening, summary tables)
- Change Data Capture (Debezium mentioned)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TRIGGER statement — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: UPDATE statement (left-to-right column evaluation) — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: JSON_ARRAYAGG() — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_json-arrayagg
- MySQL 8.0 Reference Manual: JSON_CONTAINS() — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-contains
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: Reserved Words — https://dev.mysql.com/doc/refman/8.0/en/keywords.html

## Issues Found
No technical issues found.

## Review Notes
- The trigger in Technique 2 relies on MySQL's left-to-right evaluation of SET clauses in UPDATE statements. `review_count` is incremented first, then `average_rating` uses the already-updated `review_count`. This produces the correct incremental average formula: `(old_avg * old_count + new_rating) / (old_count + 1)`. While correct, this behavior is MySQL-specific and could surprise readers porting to other databases.
- The `VALUES()` function used in `ON DUPLICATE KEY UPDATE` (Technique 4) is deprecated as of MySQL 8.0.20. The modern replacement uses a row alias (e.g., `INSERT INTO ... SELECT ... AS new ON DUPLICATE KEY UPDATE total_orders = new.total_orders`). The current syntax still works but may generate deprecation warnings on MySQL 8.0.20+.
- `DECIMAL(3,2)` for `average_rating` supports values from -9.99 to 9.99, which is sufficient for typical 1-5 or 1-10 rating scales.
