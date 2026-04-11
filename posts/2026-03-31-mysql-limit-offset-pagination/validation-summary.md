# Validation Summary: How to Use LIMIT and OFFSET in MySQL for Pagination

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LIMIT, OFFSET, keyset/cursor pagination)
- SQL (DML — SELECT, UPDATE, DELETE)
- SQL_CALC_FOUND_ROWS / FOUND_ROWS() (deprecated feature)

## Sources Consulted
- MySQL 8.0 Reference Manual — SELECT Statement, LIMIT clause: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual — SQL_CALC_FOUND_ROWS deprecation: https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_found-rows
- MySQL 8.0 Reference Manual — UPDATE and DELETE with ORDER BY and LIMIT: https://dev.mysql.com/doc/refman/8.0/en/update.html, https://dev.mysql.com/doc/refman/8.0/en/delete.html

## Issues Found

1. **Misaligned ASCII output table (Basic LIMIT section):** The result table for the Basic LIMIT example had broken column alignment — "SQL Handbook" and "MySQL Cookbook" overflowed the `name` column width, causing missing spaces before pipe delimiters. Fixed by widening the column to accommodate all values.

2. **Incorrect cursor value in keyset pagination with multiple sort keys:** The comment stated "Last row: price = 299.99, id = 10" after the first page query (`ORDER BY price DESC, id ASC LIMIT 3`). However, price = 299.99 (Monitor) is the *first* row, not the last. The actual last row is MySQL Cookbook (price = 49.99, id = 5). The page 2 WHERE clause was also wrong because it used the incorrect cursor values. Fixed the cursor comment to (49.99, 5) and updated the WHERE clause accordingly: `WHERE (price < 49.99) OR (price = 49.99 AND id > 5)`.

## Review Notes
- The "LIMIT for Top-N Queries" and "LIMIT in UPDATE and DELETE" sections reference an `is_active` column on the `products` table that is not defined in the sample data schema. These are illustrative examples showing general LIMIT patterns rather than queries intended to run against the sample data, so they are not incorrect per se, but readers copying them verbatim against the sample table will get an error. A future revision could either add `is_active` to the schema or use a different table name for those examples.
- The SQL_CALC_FOUND_ROWS deprecation date (MySQL 8.0.17) is accurate. It was removed entirely in MySQL 8.4. A future update could note the removal.
- The post correctly identifies the O(log n + page_size) complexity for keyset pagination, which is accurate for B-tree index seeks.
