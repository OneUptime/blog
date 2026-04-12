# Validation Summary: How to Use CAST() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (CAST() function, type conversion)
- SQL (standard CAST syntax)

## Sources Consulted
- [MySQL 8.0 Reference Manual — Cast Functions and Operators](https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html)
- [DbVisualizer — MySQL CAST: A Guide to the Data Conversion Function](https://www.dbvis.com/thetable/mysql-cast-a-guide-to-the-data-conversion-function/)

## Issues Found

1. **Incorrect CAST('42.99' AS SIGNED) output**: The post claimed the result was `42 (truncated)`. MySQL actually **rounds** decimal values when casting to integer types, so the correct output is `43 (rounded)`. Confirmed via MySQL documentation and multiple reference sources showing `CAST(62.73 AS SIGNED)` returns `63`. Fixed the comment on line 37.

2. **Missing version qualifier for FLOAT/DOUBLE**: The supported types list noted version requirements for JSON (`MySQL 5.7.8+`) but omitted the version note for `FLOAT` / `DOUBLE`, which were added in **MySQL 8.0.17**. Added `(MySQL 8.0.17+)` to the FLOAT/DOUBLE entry for consistency.

## Review Notes
- The age calculation using `DATEDIFF(NOW(), birth_date) / 365` is a common approximation but does not account for leap years. For precise age calculation, `TIMESTAMPDIFF(YEAR, birth_date, NOW())` would be more accurate. This is not incorrect per se, but worth noting.
- The ORDER BY example uses `SELECT id FROM items ORDER BY id` as the "wrong" lexicographic sort example, but if `id` is an integer column, it would already sort numerically. The example works conceptually (showing why casting matters for string columns) but could be clearer by using the same column name (`invoice_number`) in both the "wrong" and "correct" examples.
- The CONVERT() function description is accurate — it is MySQL-specific syntax for type conversion and also supports character set conversion via `USING`.
