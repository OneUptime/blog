# Validation Summary: How to Implement Parent-Child Relationships in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL (DDL: CREATE TABLE, DML: INSERT/UPDATE/SELECT)
- Recursive Common Table Expressions (WITH RECURSIVE)
- Self-referencing foreign keys (adjacency list model)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — Recursive Common Table Expressions: https://dev.mysql.com/doc/refman/8.0/en/with.html#common-table-expressions-recursive
- MySQL 8.0 Reference Manual — FOREIGN KEY constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — CAST and LPAD functions: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_lpad

## Issues Found
1. **sort_path in recursive CTE anchor was not zero-padded and had insufficient length.**
   - **What was wrong:** The anchor member used `CAST(sort_order AS CHAR(10)) AS sort_path`. This had two problems: (a) root-level sort_order values were not zero-padded with LPAD, so string-based sorting would fail for sort_order values >= 10 (e.g., `"9"` sorts after `"10"` in string comparison); (b) CHAR(10) is too small for deeper hierarchies — a 3-level sort_path like `"00000.00000.00000"` requires 17 characters, and MySQL determines the recursive CTE column width from the anchor member, so deeper paths would be silently truncated.
   - **What was changed:** Replaced `CAST(sort_order AS CHAR(10)) AS sort_path` with `CAST(LPAD(sort_order, 5, '0') AS CHAR(500)) AS sort_path` to match the padding used in the recursive member and provide sufficient length for deep hierarchies.
   - **Why:** Ensures consistent zero-padded string sorting at all tree levels and prevents truncation of sort paths in hierarchies deeper than 2 levels.

## Review Notes
- The `path` column in the same CTE correctly uses `CAST(name AS CHAR(500))`, providing adequate space for concatenated category names.
- The assumed AUTO_INCREMENT IDs (1-9) in the INSERT examples are correct given the insertion order and a fresh table with default auto_increment starting at 1.
- The circular reference check correctly finds all descendants of the node being moved and checks whether the target parent is among them — this is the right approach.
- All SQL syntax is valid MySQL 8.0+. The `WITH RECURSIVE` feature requires MySQL 8.0 or later, which is correctly noted in the summary.
- The `ON DELETE SET NULL` foreign key action is a reasonable choice — orphaned children become root nodes rather than being cascade-deleted.
