# Validation Summary: How to Add a Unique Constraint in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- SQL DDL (ALTER TABLE, CREATE TABLE)
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement (UNIQUE indexes) — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html

## Issues Found
No technical issues found.

## Review Notes
- The `SHOW INDEX FROM users WHERE Non_unique = 0` query will also return the PRIMARY KEY index. The post does not explicitly mention this, but the context (checking unique constraints) makes it clear enough, and the follow-up INFORMATION_SCHEMA query properly filters out PRIMARY.
- The "Dropping a Unique Constraint" section says "Or by constraint name if named differently" when switching from `DROP INDEX` to `DROP KEY`. In MySQL, `DROP INDEX` and `DROP KEY` are exact synonyms — the distinction is purely syntactic, not functional. This phrasing is slightly misleading but not technically wrong.
- All SQL syntax is correct and current for MySQL 8.0. The ALGORITHM=INPLACE, LOCK=NONE usage for adding a unique index on InnoDB is accurately documented.
