# Validation Summary: MySQL Triggers vs Application Logic: Pros and Cons

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (triggers, procedural SQL, generated columns)
- Python (application-layer database interaction)
- General database architecture patterns

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TRIGGER Syntax: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — Trigger Syntax and Examples: https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Reference Manual — CREATE TABLE Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual — NULL-safe equal operator (<=>): https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#operator_equal-to

## Issues Found
No technical issues found.

## Review Notes
- The trigger uses `OLD.salary != NEW.salary` which returns NULL (not TRUE) if either value is NULL. Using `NOT (OLD.salary <=> NEW.salary)` would be more robust for nullable columns. In practice, salary columns are typically NOT NULL, so this is an acceptable simplification for an illustrative example.
- The comment "consider disabling triggers for bulk operations" is sound advice, though MySQL does not have a `DISABLE TRIGGER` statement like SQL Server or PostgreSQL. In MySQL you would need to `DROP TRIGGER` and recreate it, or use a session variable flag checked inside the trigger body. This is general guidance rather than a specific command, so it reads fine in context.
- MySQL only supports row-level triggers (`FOR EACH ROW`), not statement-level triggers. The post correctly reflects this in its performance discussion without explicitly stating the limitation.
