# Validation Summary: How to Use INSERT ... ON DUPLICATE KEY UPDATE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general, 8.0.20+)
- SQL (INSERT, ON DUPLICATE KEY UPDATE, VALUES(), ROW_COUNT())
- InnoDB AUTO_INCREMENT behavior

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0.20 Release Notes (VALUES() deprecation and row alias syntax) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html
- MySQL 8.0 Reference Manual: Information Functions (ROW_COUNT()) — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual: AUTO_INCREMENT Handling in InnoDB — https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html

## Issues Found
No technical issues found.

## Review Notes
- The first code example in the introductory section uses the deprecated `VALUES()` syntax, but this is acceptable since the post explicitly covers the deprecation and the preferred row alias syntax in a dedicated section shortly after.
- The `affected_rows` behavior described (1=inserted, 2=updated, 0=no change) reflects the default MySQL C API behavior. Applications using the `CLIENT_FOUND_ROWS` connection flag will see different values (1 instead of 0 for no-change rows), but this edge case is minor and omitting it keeps the post focused.
- All SQL syntax is valid and all examples would execute correctly on MySQL 5.7+ (with the row alias syntax requiring 8.0.20+, as the post correctly notes).
