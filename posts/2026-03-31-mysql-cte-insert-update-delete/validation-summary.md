# Validation Summary: How to Use CTEs with INSERT, UPDATE, and DELETE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Common Table Expressions (CTEs)
- DML statements (INSERT, UPDATE, DELETE)
- ON DUPLICATE KEY UPDATE (upsert pattern)

## Sources Consulted
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — INSERT ... SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/insert-select.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — UPDATE Statement: https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual — DELETE Statement: https://dev.mysql.com/doc/refman/8.0/en/delete.html

## Issues Found

1. **Wrong CTE placement for INSERT ... SELECT (3 examples)**: All three INSERT examples placed the `WITH` clause before `INSERT`, but MySQL requires it between `INSERT INTO ... (columns)` and `SELECT`. The official docs explicitly state the pattern is `INSERT ... WITH ... SELECT ...`. Fixed by moving `INSERT INTO ... (columns)` before the `WITH` clause in all three examples.

2. **Incorrect claim about target table reference**: The post stated "MySQL does not allow referencing the target table directly in a CTE that precedes UPDATE" and repeated this in the Key Limitations section. This is incorrect — MySQL 8.0 materializes CTEs before executing the DML, making it safe to reference the target table in the CTE definition. The post's own examples (UPDATE on `employees` with CTE reading from `employees`; DELETE on `user_sessions` with CTE reading from `user_sessions`) rely on this behavior. Fixed by correcting the explanatory text and rewriting the limitations section.

3. **Misleading claim about REPLACE**: The post stated "CTEs cannot be used with REPLACE statements in all MySQL versions." CTEs with REPLACE are fully supported in MySQL 8.0 using the `REPLACE ... WITH ... SELECT` syntax. Fixed by correcting this in the limitations section and noting the actual reason to prefer ON DUPLICATE KEY UPDATE over REPLACE.

## Review Notes
- The `VALUES(column)` function used in the ON DUPLICATE KEY UPDATE example is deprecated as of MySQL 8.0.20 in favor of the row/column alias syntax introduced in MySQL 8.0.19. Added a deprecation note below the example. The code still works but will produce deprecation warnings on MySQL 8.0.20+.
- The section title "Chaining Multiple CTEs Before DML" was updated to "Chaining Multiple CTEs in a DML Statement" since for INSERT, CTEs go inside the statement, not before it.
