# Validation Summary: How to Use LEFT JOIN in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (LEFT JOIN / LEFT OUTER JOIN)

## Sources Consulted
- MySQL 8.0 Reference Manual — JOIN Clause: https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual — Aggregate Functions (COUNT, SUM, COALESCE): https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html
- MySQL 8.0 Reference Manual — CREATE TABLE: https://dev.mysql.com/doc/refman/8.0/en/create-table.html

## Issues Found
1. **Incorrect result order in aggregation example**: The output table for the "LEFT JOIN with Aggregation" example showed Carol (300.00) before Alice (350.00), but the query uses `ORDER BY total_spent DESC`. Since 350.00 > 300.00, Alice must appear first. Fixed the output row order to: Alice (350.00), Carol (300.00), Bob (75.00), Dave (0.00).

## Review Notes
- All SQL syntax is correct and uses current, non-deprecated MySQL features.
- The CREATE TABLE and INSERT statements are syntactically valid.
- The basic LEFT JOIN output correctly reflects the data and query logic.
- The anti-join pattern explanation and example are accurate.
- The explanation about WHERE vs ON clause filtering for right-table conditions is correct and is a common pitfall worth highlighting.
- The best practices section is sound. The claim that anti-join (`LEFT JOIN ... WHERE id IS NULL`) is typically faster than `NOT IN` subqueries is generally true, especially when NULLs are present in the subquery column (where `NOT IN` can produce unexpected results).
- COALESCE and IFNULL usage is correctly described.
