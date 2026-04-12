# Validation Summary: How to Implement Adjacency List Model in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- Recursive Common Table Expressions (CTEs)
- Adjacency list model for hierarchical data
- SQL DDL (CREATE TABLE with self-referencing foreign key)
- SQL DML (INSERT, UPDATE, SELECT)

## Sources Consulted
- MySQL 8.0 Reference Manual: WITH (Common Table Expressions) — https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual: CREATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: CAST and CONVERT functions — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- MySQL 8.0 Reference Manual: String functions (CONCAT, REPEAT) — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual: Foreign key constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html

## Issues Found
1. **Incorrect ORDER BY direction in "Finding the Path to Root" query (line 108):** The query used `ORDER BY id DESC` with the comment `-- CEO first`, but DESC ordering places the highest ID first (Henry, id=8) and the lowest last (Sarah CEO, id=1). Changed to `ORDER BY id ASC` so the CEO (id=1) appears first, matching the comment. Note: this ordering relies on IDs being assigned in hierarchical order, which holds for the given seed data.

## Review Notes
- The `CAST(name AS CHAR(1000))` in the recursive CTE anchor is correct and necessary — without it, MySQL would limit the `reporting_chain` column to the anchor column's type (VARCHAR(100)), which could truncate concatenated paths.
- The "Counting Subordinates" CTE uses a cross-product seeding approach (`SELECT id, id AS sub_id FROM employees`) that works correctly for tree structures but could be expensive on large datasets. This is acceptable for a tutorial.
- The circular reference check walks up from the proposed new manager to the root and checks if the target employee appears in that chain. This is a valid approach but only works as a pre-update check — it does not enforce the constraint at the database level (a trigger or application-level check would be needed for enforcement).
- The `ORDER BY id ASC` fix for the path-to-root query is correct for the given dataset but is fragile in general — IDs may not always follow hierarchical order. A more robust approach would add a `depth` counter to the CTE and order by that, but this is adequate for a tutorial with controlled seed data.
