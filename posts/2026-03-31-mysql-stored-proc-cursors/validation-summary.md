# Validation Summary: How to Use Cursors in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, cursors)
- SQL (DDL, DML, DECLARE, FETCH, LOOP)

## Sources Consulted
- MySQL 8.0 Reference Manual — Cursors: https://dev.mysql.com/doc/refman/8.0/en/cursors.html
- MySQL 8.0 Reference Manual — DECLARE ... CURSOR: https://dev.mysql.com/doc/refman/8.0/en/declare-cursor.html
- MySQL 8.0 Reference Manual — Cursor FETCH: https://dev.mysql.com/doc/refman/8.0/en/fetch.html
- MySQL 8.0 Reference Manual — DECLARE ... HANDLER: https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL 8.0 Reference Manual — Compound Statement Syntax (declaration order rules): https://dev.mysql.com/doc/refman/8.0/en/begin-end.html

## Issues Found
1. **Incorrect claim about multiple cursors:** The "Multiple Cursors in One Procedure" section stated "MySQL allows multiple cursors, but only one can be open at a time per nesting level." This is incorrect — MySQL does allow multiple cursors to be open simultaneously within the same BEGIN...END block. There is no one-at-a-time restriction per nesting level. The real concern when using multiple cursors sequentially is resetting the shared NOT FOUND handler flag between cursor uses. Updated the text to reflect this accurately.

## Review Notes
- The cursor lifecycle description (DECLARE → OPEN → FETCH loop → CLOSE) and the required declaration order (variables → cursors → handlers) are all correct per MySQL documentation.
- All SQL code examples are syntactically correct and follow the standard MySQL cursor pattern.
- The computed output values (Alice: 95000 * 1.10 = 104500.00, Bob: 65000 * 1.10 = 71500.00) are arithmetically correct.
- The "Multiple Cursors" section title is slightly misleading since the example only demonstrates a single cursor, but the code itself is correct.
- The advice to prefer set-based SQL over cursors for performance is sound and well-presented.
