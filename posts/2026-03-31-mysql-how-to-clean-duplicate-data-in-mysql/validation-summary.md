# Validation Summary: How to Clean Duplicate Data in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.x and 8.0+)
- SQL window functions (ROW_NUMBER())
- MySQL multi-table DELETE syntax
- MySQL DDL (CREATE TABLE AS, RENAME TABLE, ALTER TABLE)
- INSERT IGNORE / ON DUPLICATE KEY UPDATE

## Sources Consulted
- MySQL 8.0 Reference Manual — DELETE syntax: https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual — Window Functions: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — GROUP BY extensions: https://dev.mysql.com/doc/refman/8.0/en/group-by-handling.html
- MySQL 8.0 Reference Manual — CREATE TABLE ... SELECT: https://dev.mysql.com/doc/refman/8.0/en/create-table-select.html
- MySQL 8.0 Reference Manual — RENAME TABLE: https://dev.mysql.com/doc/refman/8.0/en/rename-table.html

## Issues Found
- **Deprecated `VALUES()` function in ON DUPLICATE KEY UPDATE**: The `ON DUPLICATE KEY UPDATE first_name = VALUES(first_name)` syntax uses the `VALUES()` function, which was deprecated in MySQL 8.0.20 (released April 2020). Updated to the modern row alias syntax: `VALUES (...) AS new ON DUPLICATE KEY UPDATE first_name = new.first_name`, which was introduced in MySQL 8.0.19.

## Review Notes
- The temporary table approach (`CREATE TABLE users_clean AS SELECT ...`) will not preserve the original table's primary key, indexes, AUTO_INCREMENT setting, or other constraints. After the RENAME swap, the new `users` table will lack these properties. Users following this approach should recreate the necessary indexes and constraints after the swap. This is not a code error (the SQL executes correctly), but is a practical caveat worth being aware of.
- MySQL's extension allowing column aliases in the HAVING clause (`HAVING cnt > 1`) is used in the second duplicate-finding query. This is MySQL-specific and would not work in standard SQL or some other databases, but is correct for MySQL.
- The self-join DELETE approach can be slow on large tables without an index on the join column (email), as it performs an O(n^2) comparison. The post doesn't mention performance implications, but the SQL is correct.
