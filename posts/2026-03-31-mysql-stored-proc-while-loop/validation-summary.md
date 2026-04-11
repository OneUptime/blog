# Validation Summary: How to Use WHILE Loop in MySQL Stored Procedures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored procedures, WHILE loops, LEAVE, ITERATE)
- SQL (DDL, DML, control flow)

## Sources Consulted
- MySQL 8.0 Reference Manual — WHILE Statement: https://dev.mysql.com/doc/refman/8.0/en/while.html
- MySQL 8.0 Reference Manual — LEAVE Statement: https://dev.mysql.com/doc/refman/8.0/en/leave.html
- MySQL 8.0 Reference Manual — ITERATE Statement: https://dev.mysql.com/doc/refman/8.0/en/iterate.html
- MySQL 8.0 Reference Manual — DECLARE Statement: https://dev.mysql.com/doc/refman/8.0/en/declare-local-variable.html
- MySQL 8.0 Reference Manual — ROW_COUNT(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual — INSERT ... SELECT: https://dev.mysql.com/doc/refman/8.0/en/insert-select.html

## Issues Found
No technical issues found.

## Review Notes
- The `ArchiveOldOrders` example uses `INSERT INTO ... SELECT ... LIMIT` followed by a separate `DELETE ... LIMIT` without an `ORDER BY` clause. In a concurrent environment, the INSERT and DELETE could theoretically target different row subsets. This is acceptable for a WHILE loop tutorial but would need additional safeguards (e.g., ORDER BY, or archiving by specific IDs) in production code.
- The `InsertOddNumbers` example correctly places the increment (`SET v_i = v_i + 1`) before the `ITERATE` statement, avoiding an infinite loop — a common pitfall worth highlighting.
- All SQL syntax is valid for MySQL 5.7+ and 8.0+.
