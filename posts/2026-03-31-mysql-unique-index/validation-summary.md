# Validation Summary: How to Create a Unique Index in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (CREATE TABLE, CREATE INDEX, ALTER TABLE, DROP INDEX)
- Unique indexes and constraints
- B-tree indexes

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/create-index.html)
- MySQL 8.0 Reference Manual: DROP INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/drop-index.html)
- MySQL 8.0 Reference Manual: ALTER TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-table.html)
- MySQL 8.0 Reference Manual: SHOW INDEX Statement (https://dev.mysql.com/doc/refman/8.0/en/show-index.html)
- MySQL 8.0 Reference Manual: DELETE Statement (https://dev.mysql.com/doc/refman/8.0/en/delete.html)

## Issues Found
1. **Incorrect claim about DROP INDEX and primary keys**: The post stated "You cannot use `DROP INDEX` to drop a primary key." This is incorrect. MySQL allows `DROP INDEX \`PRIMARY\` ON table_name;` to drop a primary key — the reserved word `PRIMARY` must be backtick-quoted. Updated the note to accurately describe both `ALTER TABLE ... DROP PRIMARY KEY` and the `DROP INDEX \`PRIMARY\`` syntax.

## Review Notes
- The `SHOW INDEX FROM users WHERE Non_unique = 0;` query will also return the PRIMARY KEY, since primary keys are unique indexes. This is technically correct but the reader might expect it to only show explicitly created unique indexes. This is a minor point and not an error.
- The duplicate-checking query uses the alias `cnt` in the HAVING clause, which is valid in MySQL but not standard SQL. This is fine for a MySQL-focused post.
- The multi-table DELETE syntax for resolving duplicates is correct but can be slow on very large tables since it performs a self-join. This is acceptable for a tutorial context.
