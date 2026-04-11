# Validation Summary: How to Use FIRST_VALUE and LAST_VALUE in MySQL Window Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (FIRST_VALUE, LAST_VALUE, NTH_VALUE)

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Descriptions — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: Window Function Concepts and Syntax — https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual: Window Function Frame Specification — https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html

## Issues Found
No technical issues found.

## Review Notes
- The explanation of the LAST_VALUE default frame gotcha is accurate and well-presented. The default frame when ORDER BY is present is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which causes LAST_VALUE to return the current row's value. The post correctly advises using `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.
- All SQL queries are syntactically correct and the expected output tables match what MySQL would produce given the sample data.
- The SELECT DISTINCT approach in the "Compute Score Improvement" example works correctly because all rows in the same partition share identical window function results when using UNBOUNDED frames.
- The NTH_VALUE example correctly includes the full frame clause, which is important for the same reason as LAST_VALUE (default frame ends at current row).
