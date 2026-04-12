# Validation Summary: How to Design Self-Referencing Tables in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB)
- SQL DDL (CREATE TABLE with self-referencing foreign key)
- SQL DML (INSERT, SELECT with self-joins)
- Recursive CTEs (MySQL 8.0+)
- Adjacency List model for hierarchical data

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE and Foreign Key Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — Recursive Common Table Expressions: https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — INSERT Statement (multi-row): https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual — CAST function: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html

## Issues Found
1. **Incorrect use of "Leaf nodes" in schema description (line 29):** The text read "Leaf nodes have a `parent_id` pointing to their parent row." In tree terminology, "leaf nodes" are specifically nodes with no children. However, ALL non-root nodes have a `parent_id` — including intermediate nodes like "Phones" which has children. Changed "Leaf nodes" to "Non-root nodes" for accuracy.

## Review Notes
- The cycle detection query in the "Preventing Cycles" section only catches direct 2-node cycles (where the proposed parent's parent is the child itself). It would not detect longer cycles (e.g., A→B→C→A). The surrounding prose correctly recommends "a trigger that traverses the chain before insertion," which would catch all cycles — but the accompanying SQL example does not implement that full traversal. Since the code is explicitly labeled as a "Simple check," this is acceptable but readers should be aware of the limitation.
- The multi-row INSERT referencing parent_ids from earlier rows in the same statement works correctly in MySQL InnoDB, as rows are processed sequentially and visible for foreign key checks within the same statement.
- The `CAST(name AS CHAR(500))` in the recursive CTE is a valid approach to ensure the path column has enough room for concatenated paths. For very deep trees, this limit could be exceeded; `CHAR(1000)` or using `VARCHAR` in a column definition might be more robust, but 500 is reasonable for the tutorial context.
