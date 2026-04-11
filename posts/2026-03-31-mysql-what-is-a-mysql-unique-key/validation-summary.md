# Validation Summary: What Is a MySQL Unique Key

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (CREATE TABLE, ALTER TABLE)
- SQL DML (INSERT, INSERT IGNORE, ON DUPLICATE KEY UPDATE)
- MySQL unique constraints and indexing

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — UNIQUE Constraints: https://dev.mysql.com/doc/refman/8.0/en/constraint-primary-key.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — InnoDB Clustered and Secondary Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html

## Issues Found
- **Incorrect NULL comments in code example (lines 50-51)**: The comments on the `email` and `phone` columns in the `contacts` table said `-- UK, allows one NULL`, which contradicts the comparison table and the NULL handling section that both correctly state multiple NULLs are allowed. Fixed to `-- UK, allows multiple NULLs`. In MySQL, a UNIQUE constraint permits multiple NULL values because NULL is not considered equal to any other NULL.

## Review Notes
- The `VALUES(name)` syntax used in the `ON DUPLICATE KEY UPDATE` clause (line 103) was deprecated in MySQL 8.0.20 in favor of row alias syntax (e.g., `INSERT INTO ... VALUES (...) AS new ON DUPLICATE KEY UPDATE name = new.name`). Since the post does not target a specific MySQL version and the old syntax still functions across all versions, this was not changed, but readers using MySQL 8.0.20+ may see deprecation warnings.
- All SQL syntax is correct and would execute as described.
- The comparison table between primary keys and unique keys is accurate for InnoDB.
- The EXPLAIN output claim of `const` access type for unique key lookups is correct.
