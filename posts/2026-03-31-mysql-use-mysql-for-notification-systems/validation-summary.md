# Validation Summary: How to Use MySQL for Notification Systems

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ due to JSON column type)
- SQL (DDL, DML)
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/create-table.html)
- MySQL 8.0 Reference Manual: JSON Data Type (https://dev.mysql.com/doc/refman/8.0/en/json.html)
- MySQL 8.0 Reference Manual: INSERT ... SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/insert-select.html)
- MySQL 8.0 Reference Manual: DELETE Statement (https://dev.mysql.com/doc/refman/8.0/en/delete.html)
- MySQL 8.0 Reference Manual: Date and Time Functions — NOW(), INTERVAL (https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html)
- MySQL 8.0 Reference Manual: CREATE INDEX / Composite Indexes (https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html)

## Issues Found
No technical issues found.

## Review Notes
- The `JSON` column type requires MySQL 5.7.8 or later. The post does not specify a minimum MySQL version, which is fine since 5.7+ is the de facto baseline today.
- The unread count query claims to use the `(recipient_id, is_read, created_at)` index and "runs in microseconds." The index is used for the `(recipient_id, is_read)` prefix, but the `expires_at` filter requires a table data lookup since `expires_at` is not in the index. The claim is still reasonable because the index narrows the result set to the specific user's unread rows, making the remaining filter cheap.
- The `DELETE ... LIMIT 10000` syntax is a MySQL-specific extension not available in standard SQL or most other databases. This is fine for a MySQL-focused post but worth noting for readers porting to other systems.
- The composite index is well-chosen for the notification feed query (which orders by `created_at`), but could also benefit from including `expires_at` if expiry-filtered queries are frequent. This is an optimization consideration, not an error.
