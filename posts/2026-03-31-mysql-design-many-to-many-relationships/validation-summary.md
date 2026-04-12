# Validation Summary: How to Design Many-to-Many Relationships in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, foreign keys, composite primary keys)
- Junction table / associative table design pattern
- SQL JOIN queries
- INSERT ... ON DUPLICATE KEY UPDATE

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: DATETIME default values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual: Foreign Key Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: Composite Indexes — https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html

## Issues Found
No technical issues found.

## Review Notes
- `TINYINT(1)` display width in the ALTER TABLE example is deprecated as of MySQL 8.0.17 (display widths for integer types are deprecated). The column type itself still works correctly and `TINYINT(1)` remains the conventional boolean pattern in MySQL, so this is not an error but worth noting for future updates.
- The `NOT IN` subquery pattern for finding non-enrolled students is correct given the `NOT NULL` constraint on `student_id`. In schemas where the subquery column could contain NULLs, `NOT EXISTS` or `LEFT JOIN ... IS NULL` would be safer alternatives.
