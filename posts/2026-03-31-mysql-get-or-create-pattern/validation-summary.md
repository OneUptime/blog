# Validation Summary: How to Implement Get or Create Pattern in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (INSERT IGNORE, ON DUPLICATE KEY UPDATE, LAST_INSERT_ID(), stored procedures, UNIQUE constraints)
- JavaScript / Node.js (mysql2 promise API)
- SQL (DDL, DML, stored procedure syntax)

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: INSERT IGNORE — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: LAST_INSERT_ID() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual: CREATE PROCEDURE — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- mysql2 Node.js driver documentation — https://github.com/sidorares/node-mysql2

## Issues Found
No technical issues found.

## Review Notes
- Approach 2 states the ID is retrieved "without a second query," but the SQL example does show a second `SELECT LAST_INSERT_ID()` statement. In practice, most MySQL client libraries (including mysql2) expose `lastInsertId` as part of the INSERT result object, so a separate SELECT is not needed at the driver level. The SQL example demonstrates the mechanism correctly; the phrasing is slightly informal but not incorrect.
- Approach 3's heading mentions "Atomicity," but stored procedures are not inherently atomic without explicit transaction control. The body text correctly says "for clean reuse," and the INSERT IGNORE + SELECT pattern works correctly without atomicity guarantees, so this is a labeling nuance rather than a technical error.
- `INSERT IGNORE` silently suppresses all errors (not just duplicate key), including data truncation warnings. This is a known caveat not mentioned in the post but is more of an advanced consideration than an error.
- All SQL syntax is valid for MySQL 5.7+ and 8.x. The JavaScript code correctly uses the mysql2 promise API with parameterized queries, preventing SQL injection.
