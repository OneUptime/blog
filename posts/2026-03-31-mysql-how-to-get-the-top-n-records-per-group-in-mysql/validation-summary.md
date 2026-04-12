# Validation Summary: How to Get the Top N Records per Group in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (window functions, CTEs)
- MySQL 5.7 (correlated subquery fallback)
- SQL window functions: ROW_NUMBER(), RANK(), DENSE_RANK()

## Sources Consulted
- MySQL 8.0 Reference Manual: Window Functions — https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual: Window Function Descriptions (ROW_NUMBER, RANK, DENSE_RANK) — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 5.7 Reference Manual: Subqueries — https://dev.mysql.com/doc/refman/5.7/en/subqueries.html

## Issues Found
- **Mislabeled correlated subquery as "self-join"**: The MySQL 5.7 fallback section intro said "use a self-join or user variable" and the SQL comment said `-- Self-join approach`, but the actual code uses a correlated subquery (a `SELECT COUNT(*)` subquery in the `WHERE` clause), not a `JOIN`. Changed both the intro text and the SQL comment to say "correlated subquery" to accurately describe the technique shown.

## Review Notes
- All SQL syntax is correct for MySQL 8.0 and would execute as shown.
- The expected output for the ROW_NUMBER() example is verified correct against the sample dataset.
- The RANK() tie behavior explanation is accurate: tied rows share the same rank and subsequent positions are skipped.
- The DENSE_RANK() explanation is accurate: tied rows share the same rank with no gaps.
- The correlated subquery approach for MySQL 5.7 is logically correct but behaves more like DENSE_RANK() than ROW_NUMBER() when ties exist (tied rows are both included). This is not mentioned in the post but is a minor nuance, not an error.
- The orders table example references a table not defined in the sample dataset, which is fine as it serves as a standalone pattern illustration.
