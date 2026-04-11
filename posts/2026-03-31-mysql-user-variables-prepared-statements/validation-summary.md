# Validation Summary: How to Use User Variables with Prepared Statements in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (prepared statements, user variables, stored procedures)
- SQL (dynamic SQL, EXECUTE ... USING)

## Sources Consulted
- MySQL 8.0 Reference Manual: PREPARE Statement — https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL 8.0 Reference Manual: EXECUTE Statement — https://dev.mysql.com/doc/refman/8.0/en/execute.html
- MySQL 8.0 Reference Manual: User-Defined Variables — https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual: DEALLOCATE PREPARE Statement — https://dev.mysql.com/doc/refman/8.0/en/deallocate-prepare.html
- MySQL 8.0 Reference Manual: SELECT ... INTO Statement — https://dev.mysql.com/doc/refman/8.0/en/select-into.html

## Issues Found

1. **Missing `@` prefix on user variable (line 17):** The "WRONG" example had `SET STMT = '...'` instead of `SET @stmt = '...'`. Without the `@` prefix, this is a syntax error outside of a stored procedure. Fixed to `SET @stmt`.

2. **Deprecated `:=` assignment syntax in SELECT (line 62):** `SELECT @latest_id := MAX(id) FROM orders` uses the `:=` operator in a SELECT statement, which has been deprecated since MySQL 8.0.13. Fixed to `SELECT MAX(id) INTO @latest_id FROM orders`, which is the recommended approach. Also updated the Summary section's reference from `SELECT @var := ...` to `SELECT ... INTO @var`.

3. **Non-existent `typeof()` function shown in code (line 127):** The example `SELECT @amount, typeof(@amount)` would produce an error since MySQL has no `typeof()` function. While the inline comment acknowledged this, showing non-working SQL in a tutorial is misleading. Replaced with a comment explaining MySQL lacks `typeof()` and kept the working CAST example.

## Review Notes
- The `SELECT @var := expr` syntax, while deprecated in MySQL 8.0.13, still functions and won't be removed until a future major version. However, new tutorials should teach the `SELECT ... INTO @var` pattern.
- The stored procedure example correctly demonstrates the common pattern of bridging local variables to user variables for use with EXECUTE ... USING. Note that user variables in stored procedures are session-scoped (not procedure-scoped), which can cause subtle bugs in concurrent sessions reusing connections. The post could benefit from a brief caution about this in the future.
- The DEALLOCATE PREPARE cleanup shown in the "Multiple Parameter Variables" section is missing, though this is a minor omission since the statement would be cleaned up at session end.
