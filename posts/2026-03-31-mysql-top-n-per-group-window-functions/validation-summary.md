# Validation Summary: How to Find Top N per Group Using Window Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL Window Functions (ROW_NUMBER, RANK, DENSE_RANK)
- Common Table Expressions (CTEs)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — Window Function Descriptions (ROW_NUMBER, RANK, DENSE_RANK): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — WITH (Common Table Expressions): https://dev.mysql.com/doc/refman/8.0/en/with.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples are syntactically correct and use valid MySQL 8.0+ features.
- The explanations of ROW_NUMBER(), RANK(), and DENSE_RANK() tie-handling behavior are accurate.
- The comparison table correctly describes the row counts returned under a 2-way tie scenario for each function.
- The "Combining Top-N with Aggregates" example references a `sales` table not defined in the sample data, but this is acceptable as it illustrates a general pattern rather than a runnable example tied to the sample data.
- Window functions require MySQL 8.0 or later; the post correctly notes this version requirement.
