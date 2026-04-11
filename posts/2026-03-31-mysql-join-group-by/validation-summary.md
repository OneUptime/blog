# Validation Summary: How to Use JOIN with GROUP BY in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.x
- SQL (JOIN, GROUP BY, HAVING, ROLLUP, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: GROUP BY Modifiers (WITH ROLLUP) — https://dev.mysql.com/doc/refman/8.0/en/group-by-modifiers.html
- MySQL 8.0 Reference Manual: MySQL Handling of GROUP BY — https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual: ONLY_FULL_GROUP_BY — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_only_full_group_by

## Issues Found
- **Code fence language on execution order diagram**: The code fence was tagged as `dockerfile` but the content is a plain-text diagram of SQL logical execution order. Changed to `text`.

## Review Notes
- The `COALESCE(c.name, 'TOTAL')` pattern in the ROLLUP example is the commonly-taught simplified approach. In production, the `GROUPING()` function (available since MySQL 8.0.1) is more robust because it distinguishes ROLLUP-generated NULLs from actual NULL values in the data. The post's approach is acceptable for a tutorial.
- The ROLLUP query groups by both `c.category_id` and `c.name`, which are functionally dependent (category_id is the primary key). This causes ROLLUP to produce an intermediate subtotal level per category_id (where c.name is NULL) that is redundant with the per-group rows. Grouping by `c.name` alone would produce cleaner output. This is a design consideration rather than an error.
- The post correctly notes that MySQL allows referencing SELECT column aliases in HAVING clauses. This is a MySQL-specific extension not available in all SQL databases.
- `ONLY_FULL_GROUP_BY` was actually enabled by default starting in MySQL 5.7.5, not just MySQL 8. The post's statement is not wrong (MySQL 8 does enforce it) but could be more precise.
