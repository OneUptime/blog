# Validation Summary: How to Use FOUND_ROWS() and ROW_COUNT() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0
- SQL_CALC_FOUND_ROWS / FOUND_ROWS()
- ROW_COUNT()
- Stored procedures (DELIMITER, SIGNAL)
- INSERT ... ON DUPLICATE KEY UPDATE

## Sources Consulted
- MySQL 8.0 Reference Manual — Information Functions (FOUND_ROWS, ROW_COUNT): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html
- MySQL 8.0 Reference Manual — SELECT Statement (SQL_CALC_FOUND_ROWS deprecation): https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — CALL Statement: https://dev.mysql.com/doc/refman/8.0/en/call.html

## Issues Found

1. **FOUND_ROWS() deprecation omitted**: The post stated only `SQL_CALC_FOUND_ROWS` is deprecated as of MySQL 8.0.17, but the official docs confirm both `SQL_CALC_FOUND_ROWS` and `FOUND_ROWS()` are deprecated together. Updated the deprecation notice and summary paragraph to mention both.

2. **ROW_COUNT() after CALL incorrectly listed as -1**: The ROW_COUNT() table listed `CALL` as returning -1. Per the MySQL CALL statement docs, ROW_COUNT() after CALL returns the value from the last statement executed within the procedure, not -1. Updated the table entry.

3. **Flowchart error — "Call FOUND_ROWS → ROW_COUNT not reset"**: The ROW_COUNT() reset rules flowchart claimed that calling FOUND_ROWS() does not reset ROW_COUNT. This is incorrect because FOUND_ROWS() is invoked via `SELECT FOUND_ROWS()`, which is a SELECT returning a result set, and therefore resets ROW_COUNT to -1. Replaced this branch with `SELECT ROW_COUNT()` → "Returns current value, then resets to -1", which accurately describes the important practical behavior.

## Review Notes
- The "Checking whether an UPDATE actually changed a row" code block (lines 95–103) uses IF/THEN/END IF and SIGNAL syntax outside of a stored procedure wrapper. This syntax only works inside stored programs. It is understandable in context (the next section shows a full procedure), but a brief comment like `-- Inside a stored procedure:` could improve clarity for beginners.
- The LOAD DATA entry in the ROW_COUNT table says "Number of rows inserted," which is a simplification. With REPLACE mode, the affected-rows count includes both inserted and deleted rows. This is acceptable for a general tutorial.
- The CLIENT_FOUND_ROWS mention in the "Key points" section is accurate and a useful detail for readers using various MySQL client libraries.
