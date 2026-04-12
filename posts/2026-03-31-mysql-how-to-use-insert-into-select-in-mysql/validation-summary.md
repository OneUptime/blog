# Validation Summary: How to Use INSERT INTO ... SELECT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (INSERT INTO ... SELECT syntax)
- SQL (JOINs, GROUP BY, HAVING, aggregate functions)
- MySQL-specific extensions (INSERT IGNORE, ON DUPLICATE KEY UPDATE, CREATE TABLE ... AS SELECT, CREATE TABLE ... LIKE)

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT ... SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/insert-select.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: CREATE TABLE ... SELECT — https://dev.mysql.com/doc/refman/8.0/en/create-table-select.html
- MySQL 8.0 Reference Manual: CREATE TABLE ... LIKE — https://dev.mysql.com/doc/refman/8.0/en/create-table-like.html
- MySQL 8.0 Reference Manual: GROUP BY Functional Dependence — https://dev.mysql.com/doc/refman/8.0/en/group-by-functional-dependence.html
- MySQL 8.0 Reference Manual: INSERT IGNORE — https://dev.mysql.com/doc/refman/8.0/en/insert.html

## Issues Found
No technical issues found.

## Review Notes
- The `VALUES()` function used in the `ON DUPLICATE KEY UPDATE` example (line 145) was deprecated in MySQL 8.0.20 in favor of row alias syntax (e.g., `INSERT INTO ... SELECT ... AS new ON DUPLICATE KEY UPDATE col = new.col`). The current syntax still works across all MySQL versions but may be removed in a future release. Since the post does not target a specific MySQL version, this is not an error but worth noting for future updates.
- The archive-then-delete pattern (lines 87-94) is not wrapped in a transaction. Between the INSERT and DELETE, concurrent writes could cause data to be deleted without being archived, or new matching rows could appear. This is acceptable for a tutorial example but users should be aware of this in production use.
- The `GROUP BY c.id` in the CREATE TABLE ... AS SELECT example (line 129) relies on MySQL's functional dependency detection, which requires `c.id` to be the primary key and `ONLY_FULL_GROUP_BY` SQL mode to be active (default since MySQL 5.7.5). This is a reasonable assumption but could confuse users with non-standard configurations.
