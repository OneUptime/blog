# Validation Summary: How to Calculate Running Totals in MySQL Without Window Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.6 / 5.7 (pre-window-function versions)
- MySQL 8.0 (referenced for window function alternative)
- SQL correlated subqueries
- MySQL user-defined variables (`@var := ...`)
- SQL self-joins

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual — CREATE TABLE (PRIMARY KEY indexing): https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 5.7 Reference Manual — User-Defined Variables: https://dev.mysql.com/doc/refman/5.7/en/user-variables.html
- MySQL 8.0 Reference Manual — InnoDB Index Types (clustered index): https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html

## Issues Found
- **Redundant index on PRIMARY KEY column**: The post suggested `ALTER TABLE daily_sales ADD INDEX idx_sale_date (sale_date);` for better performance, but `sale_date` is already the `PRIMARY KEY` of the table and thus already has a clustered index in InnoDB. Adding a secondary index on the same column is redundant. Fixed by clarifying that the example table already has `sale_date` indexed as the primary key, and the `ADD INDEX` advice applies to tables where the running-total column is not the primary key.

## Review Notes
- The user variable technique (`@var := @var + column`) relies on left-to-right evaluation order in the SELECT list, which MySQL documentation states is undefined. In practice this works reliably on MySQL 5.6/5.7, and the post correctly targets those versions. However, this syntax is deprecated as of MySQL 8.0.22. The post's framing as a legacy/pre-8.0 technique is appropriate.
- The partitioned running total example references a `category_sales` table that is not defined in the sample data section. This is intentional (separate illustrative example), but readers may need to infer the schema.
- The window function syntax in the summary (`SUM(amount) OVER (ORDER BY sale_date ROWS UNBOUNDED PRECEDING)`) is correct MySQL 8.0+ syntax.
- All computed running total values in the result table were verified and are correct.
