# Validation Summary: How to Design a Hierarchical Data Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for recursive CTEs)
- Adjacency List pattern
- Nested Set model
- Closure Table pattern

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE syntax: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — Recursive CTEs (WITH RECURSIVE): https://dev.mysql.com/doc/refman/8.0/en/with.html
- MySQL 8.0 Reference Manual — FOREIGN KEY constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — LAST_INSERT_ID(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- Bill Karwin, "SQL Antipatterns" — Chapter on Trees (Closure Table pattern reference)
- Joe Celko, "Trees and Hierarchies in SQL for Smarties" — Nested Set model reference

## Issues Found
No technical issues found.

## Review Notes
- The nested set query uses `WHERE lft BETWEEN 2 AND 9` which returns the node itself plus all descendants (the full subtree), while the comment says "all descendants." This is the standard way nested sets are presented in the literature and is not technically wrong, but could be more precise by saying "the node and all its descendants" or using `WHERE lft > 2 AND rgt < 9` for strict descendants only.
- The closure table insert pattern does not use a transaction. In production, the three INSERT statements should be wrapped in a transaction to ensure atomicity. This is a simplification appropriate for a tutorial but worth noting.
- All SQL syntax is valid for MySQL 8.0+. The adjacency list pattern with recursive CTEs requires MySQL 8.0 or later, which is correctly noted in the post.
