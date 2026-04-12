# Validation Summary: How to Implement Time-to-Live (TTL) for MySQL Rows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Event Scheduler, ALTER TABLE, CREATE EVENT, DATE_ADD, DATE_SUB, SHA2, information_schema.EVENTS)
- SQL (DDL, DML, INSERT...ON DUPLICATE KEY UPDATE)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: Event Scheduler Overview — https://dev.mysql.com/doc/refman/8.0/en/events-overview.html
- MySQL 8.0 Reference Manual: DATE_ADD / DATE_SUB Functions — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- MySQL 8.0 Reference Manual: DELETE Syntax (LIMIT clause) — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual: information_schema.EVENTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-events-table.html
- MySQL 8.0 Reference Manual: SHA2 Function — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_sha2
- MySQL 8.0 Reference Manual: INSERT...ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html

## Issues Found
- **Unnecessary BEGIN...END in first CREATE EVENT**: The `expire_user_sessions` event wrapped a single DELETE statement in a `BEGIN...END` compound statement block. This is unnecessary for a single statement and would cause parsing errors in the mysql command-line client without first changing the `DELIMITER`. The second event (`expire_password_reset_tokens`) correctly used a bare statement without `BEGIN...END`. Fixed by removing the `BEGIN...END` wrapper to match the second event's style and avoid the delimiter issue.

## Review Notes
- The second event (`expire_password_reset_tokens`) deletes rows where `expires_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)`, meaning it only deletes tokens that expired more than 1 hour ago. This is a valid design choice (grace period) but readers should be aware this differs from the first event which deletes immediately upon expiry.
- The rate limiting example uses `DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00')` which returns a string that MySQL implicitly converts to DATETIME. This works but readers should be aware of the implicit conversion.
- All SQL syntax is valid for MySQL 5.7+ and MySQL 8.0+.
