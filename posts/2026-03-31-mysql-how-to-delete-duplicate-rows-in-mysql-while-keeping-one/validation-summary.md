# Validation Summary: How to Delete Duplicate Rows in MySQL While Keeping One

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7 and 8.0
- SQL (DELETE, ROW_NUMBER(), self-joins, subqueries, CREATE TABLE AS SELECT)
- MySQL unique constraints and INSERT IGNORE / ON DUPLICATE KEY UPDATE

## Sources Consulted
- MySQL 8.0 Reference Manual: DELETE Statement — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual: Window Functions (ROW_NUMBER) — https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: CREATE TABLE ... SELECT — https://dev.mysql.com/doc/refman/8.0/en/create-table-select.html
- MySQL 8.0 Reference Manual: RENAME TABLE — https://dev.mysql.com/doc/refman/8.0/en/rename-table.html

## Issues Found
- **Summary text incorrectly called the ROW_NUMBER() approach a "CTE approach"**: The code in Method 1 uses derived tables (nested subqueries), not a Common Table Expression (WITH ... AS). Changed "CTE approach" to "window function approach" in the summary paragraph on line 179.

## Review Notes
- **`VALUES()` in ON DUPLICATE KEY UPDATE is deprecated since MySQL 8.0.20**: The post uses `ON DUPLICATE KEY UPDATE name = VALUES(name)`, which still works but is deprecated. The new recommended syntax uses a row alias: `INSERT INTO ... VALUES (...) AS new ON DUPLICATE KEY UPDATE name = new.name`. Since the old syntax still functions and the post covers both 5.7 and 8.0, this was not changed, but readers targeting MySQL 8.0.20+ should use the new syntax.
- **`CREATE TABLE ... AS SELECT` does not preserve indexes or constraints**: Method 4 uses this pattern, which means the resulting `customers_deduped` table will lack the PRIMARY KEY, AUTO_INCREMENT, and any other indexes from the original table. The SQL executes correctly, but users following this approach should re-add indexes after the table swap. This is not an error in the SQL itself but is a practical caveat worth noting.
- All four deletion methods are syntactically correct and logically sound for their target MySQL versions.
- The duplicate-finding queries correctly use MySQL's support for column aliases in HAVING clauses.
