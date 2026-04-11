# Validation Summary: How to Use NTH_VALUE() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (NTH_VALUE, FIRST_VALUE, LAST_VALUE)
- Named WINDOW clause

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Function Descriptions — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: Window Function Concepts and Syntax — https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual: Window Function Frame Specification — https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html

## Issues Found
No technical issues found.

## Review Notes
- The basic example intentionally omits the full frame clause to set up the next section's explanation of why the frame matters. This is a good pedagogical choice, though readers running the first query may be surprised by NULL values in the second_place_time and third_place_time columns for early rows.
- All SQL syntax is correct for MySQL 8.0+. The named WINDOW clause, PARTITION BY usage, and ROUND() function are all used correctly.
- The claim that `FIRST_VALUE()` is equivalent to `NTH_VALUE(expr, 1)` is accurate per MySQL documentation.
- The default frame specification (`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`) is correctly stated.
