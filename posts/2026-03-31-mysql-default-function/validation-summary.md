# Validation Summary: How to Use DEFAULT() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DEFAULT() miscellaneous function)
- SQL (INSERT, UPDATE, SELECT, CASE expressions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Miscellaneous Functions (DEFAULT): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html#function_default
- MySQL 8.0 Reference Manual — INSERT Statement: https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual — Data Type Default Values: https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — CREATE TABLE and Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html

## Issues Found

1. **Misleading "requires at least one row" claim**: The post stated that `DEFAULT()` requires at least one row to exist in the table, implying this is a restriction of the function itself. In reality, `SELECT ... FROM table` over an empty table returns no rows regardless of the expression. The function does not inherently require rows — it is standard SELECT behavior. Fixed to clarify this distinction.

2. **Missing critical limitation about expression defaults**: The Limitations section omitted the most prominently documented restriction of `DEFAULT(col_name)`: as of MySQL 8.0.13, it only works with columns that have a **literal** default value, not an expression default (e.g., `DEFAULT (RAND() * RAND())`). Added this information alongside the existing note about AUTO_INCREMENT and generated columns, and clarified that the reason those column types don't work is that they lack literal defaults.

## Review Notes
- The CASE expression example references a `customer_tier` column and an `updated_at` column that are not defined in the `orders` table from earlier in the post. This is acceptable since it is illustrative, but could be confusing to readers who try to run all examples sequentially.
- The `orders` table uses `DEFAULT CURRENT_TIMESTAMP` on a DATETIME column. `CURRENT_TIMESTAMP` for TIMESTAMP/DATETIME is historically special-cased and treated as a literal default (not an expression default in the 8.0.13 sense), so `DEFAULT(created_at)` would work. However, the blog never explicitly calls `DEFAULT(created_at)`, so this is not an issue in practice.
- The bare `DEFAULT` keyword and the `DEFAULT(col_name)` function behave differently for columns without an explicit DEFAULT in non-strict SQL mode — the keyword may use an implicit default while the function errors. The post doesn't cover this nuance but it is an edge case unlikely to affect most readers.
