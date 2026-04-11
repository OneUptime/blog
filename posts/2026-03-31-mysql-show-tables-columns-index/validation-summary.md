# Validation Summary: How to Use MySQL SHOW TABLES, SHOW COLUMNS, SHOW INDEX

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (8.0+)
- SQL SHOW statements (SHOW TABLES, SHOW COLUMNS, SHOW INDEX, SHOW DATABASES, SHOW STATUS, SHOW VARIABLES, SHOW WARNINGS)
- INFORMATION_SCHEMA views
- InnoDB (implicit foreign key indexes)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW TABLES — https://dev.mysql.com/doc/refman/8.0/en/show-tables.html
- MySQL 8.0 Reference Manual: SHOW COLUMNS — https://dev.mysql.com/doc/refman/8.0/en/show-columns.html
- MySQL 8.0 Reference Manual: SHOW INDEX — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: SHOW DATABASES — https://dev.mysql.com/doc/refman/8.0/en/show-databases.html
- MySQL 8.0 Reference Manual: SHOW STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-status.html
- MySQL 8.0 Reference Manual: SHOW VARIABLES — https://dev.mysql.com/doc/refman/8.0/en/show-variables.html
- MySQL 8.0 Reference Manual: CREATE TABLE (foreign key index auto-creation) — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html

## Issues Found
1. **SHOW INDEX output row order was incorrect.** MySQL sorts SHOW INDEX results by `Non_unique`, `Key_name`, `Seq_in_index`. The non-unique indexes (Non_unique=1) must appear in alphabetical order by Key_name: `category_id` first, then `idx_products_category` (seq 1 and 2), then `idx_products_price`. The original post had `idx_products_price` listed before `idx_products_category`, and `category_id` listed last. Fixed by reordering the rows to match MySQL's actual output ordering.

## Review Notes
- The `DEFAULT NOW()` in the CREATE TABLE is valid in MySQL 8.0.13+ (expression defaults). The post does not specify a MySQL version, so readers on older versions may encounter an error here.
- The INFORMATION_SCHEMA equivalences are simplified approximations — the SHOW variants implicitly scope to the current database, while the INFORMATION_SCHEMA queries shown omit a TABLE_SCHEMA filter. This is acceptable for illustrative purposes and the post correctly notes that INFORMATION_SCHEMA offers "more filtering power."
- The SHOW INDEX output table only shows a subset of columns (Table, Non_unique, Key_name, Seq_in_index, Column_name, Cardinality). The actual MySQL output includes additional columns (Sub_part, Packed, Null, Index_type, Comment, Index_comment, Visible, Expression). This is a reasonable simplification for readability.
- SHOW FULL COLUMNS is described as including "collation and comment" — it also includes Privileges, but this omission is minor and not misleading.
