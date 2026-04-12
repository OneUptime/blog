# Validation Summary: How to Design a Schema for a Blog Application in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL: CREATE TABLE, indexes, foreign keys, ENUM, FULLTEXT)
- SQL query patterns (JOIN, GROUP BY, MATCH...AGAINST full-text search)
- Relational schema design (self-referencing tables, junction tables)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — FULLTEXT Indexes: https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual — MATCH...AGAINST Syntax: https://dev.mysql.com/doc/refman/8.0/en/fulltext-natural-language.html
- MySQL 8.0 Reference Manual — GROUP BY Functional Dependency Detection: https://dev.mysql.com/doc/refman/8.0/en/group-by-functional-dependence.html
- MySQL 8.0 Reference Manual — Foreign Key Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — AUTO_INCREMENT: https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html

## Issues Found
No technical issues found.

## Review Notes
- `DATETIME DEFAULT CURRENT_TIMESTAMP` requires MySQL 5.6.5+. The post does not specify a minimum version, but MySQL 5.6 reached end-of-life in February 2021, so this is a reasonable baseline assumption.
- FULLTEXT indexes on InnoDB tables require MySQL 5.6+. Again a reasonable assumption given current MySQL versions.
- The `GROUP BY p.id` in the tag-count query relies on MySQL's functional dependency detection (enabled by default via `ONLY_FULL_GROUP_BY` since MySQL 5.7.5). This is technically correct but worth noting for readers using older MySQL versions or non-default SQL modes.
- The self-referencing foreign key on `categories.parent_id` defaults to `ON DELETE RESTRICT`, which prevents deleting a parent category that still has children. This is a valid design choice but readers may want `ON DELETE SET NULL` or `ON DELETE CASCADE` depending on their requirements.
