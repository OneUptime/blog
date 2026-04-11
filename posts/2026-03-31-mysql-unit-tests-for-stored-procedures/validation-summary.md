# Validation Summary: How to Write Unit Tests for MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, CASE statements, transactions, SAVEPOINT/ROLLBACK)
- SQL DDL (CREATE TABLE, CREATE PROCEDURE)
- SQL testing patterns (assertion procedures, rollback isolation)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE PROCEDURE and CREATE FUNCTION Statements: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — CASE Statement: https://dev.mysql.com/doc/refman/8.0/en/case.html
- MySQL 8.0 Reference Manual — DECLARE Statement: https://dev.mysql.com/doc/refman/8.0/en/declare-local-variable.html
- MySQL 8.0 Reference Manual — START TRANSACTION, COMMIT, and ROLLBACK Statements: https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual — LAST_INSERT_ID(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual — CAST and CONVERT Functions: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- MySQL 8.0 Reference Manual — NULL comparison behavior: https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html

## Issues Found
1. **Rollback isolation example rolled back test results along with test data.** In the `test_with_isolation` procedure, the `CALL assert_not_null(...)` was placed inside the `START TRANSACTION` / `ROLLBACK` block. Since `assert_not_null` inserts into the `test_results` table (InnoDB), the ROLLBACK undid both the test data INSERT and the assertion result INSERT, meaning no test result was ever recorded. **Fix:** Captured `LAST_INSERT_ID()` into a local variable before the ROLLBACK, moved the `CALL assert_not_null(...)` to after the ROLLBACK so the assertion result persists.

## Review Notes
- The `assert_equals` procedure correctly handles the MySQL NULL-comparison edge case (`NULL = NULL` evaluates to NULL, not TRUE), using an explicit `p_expected IS NULL AND p_actual IS NULL` check.
- `LAST_INSERT_ID()` is session-scoped and survives a ROLLBACK in MySQL, so capturing it into a local variable before rollback is reliable.
- `TRUNCATE TABLE` is a DDL statement that causes an implicit COMMIT in MySQL. This is fine in the post since it is used outside any transaction context.
- The post does not mention any specific MySQL version. All syntax and features used are compatible with MySQL 5.7+ and 8.0+.
