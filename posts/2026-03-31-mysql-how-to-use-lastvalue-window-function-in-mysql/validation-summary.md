# Validation Summary: How to Use LAST_VALUE() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (LAST_VALUE, FIRST_VALUE, NTH_VALUE)
- SQL frame clauses (ROWS BETWEEN)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Function Concepts and Syntax: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html

## Issues Found
1. **NTH_VALUE with nested window function**: The `LAST_VALUE() vs NTH_VALUE()` example used `NTH_VALUE(val, COUNT(*) OVER ())` which nests a window function (`COUNT(*) OVER ()`) as the N argument to another window function. MySQL does not allow window functions as arguments to other window functions — this would produce a syntax error. Fixed by replacing with the literal value `NTH_VALUE(val, 3)` since the derived table has exactly 3 rows, and added a comment clarifying the equivalence.

## Review Notes
- The post correctly emphasizes the critical default frame clause issue with LAST_VALUE(), which is the most common source of confusion for this function. The default frame when ORDER BY is present is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, making LAST_VALUE() return the current row's value rather than the partition's last value.
- All CREATE TABLE / INSERT statements are syntactically correct.
- The FIRST_VALUE vs LAST_VALUE comparison and the practical end-of-period balance example are accurate.
- DATE_FORMAT usage in PARTITION BY is valid MySQL syntax.
