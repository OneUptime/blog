# Validation Summary: How to Implement Soft Deletes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, views, triggers, generated columns, indexes)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE syntax — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: UNIQUE indexes and NULL handling — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: CREATE TRIGGER syntax — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: CREATE VIEW syntax — https://dev.mysql.com/doc/refman/8.0/en/create-view.html

## Issues Found
1. **Incorrect unique constraint approach (Option 1)**: The original post suggested using a composite unique index on `(email, deleted_at)` and claimed it "Only allows one active user per email (deleted_at IS NULL)." This is incorrect. In MySQL, NULL is not considered equal to NULL for unique index purposes, so multiple active rows with the same email and `deleted_at = NULL` would all be allowed — defeating the uniqueness enforcement for active records. **Fix**: Replaced Option 1 with a generated column approach (`active_email` that is the email for active records and NULL for deleted records, with a unique index on that column). Added an explanatory note about why the composite index approach does not work. Option 2 (mutating the email on delete) was retained as-is since it is correct.

## Review Notes
- The `TINYINT(1)` display width used in the "Index Strategy" section is deprecated as of MySQL 8.0.17, but the column type itself still functions correctly. This is cosmetic and does not affect behavior.
- The trigger uses `AFTER UPDATE`, which is correct for cascading soft deletes. An alternative would be `BEFORE UPDATE`, but `AFTER UPDATE` is fine since it modifies a different table (`orders`), not the trigger's own table.
- The scheduled cleanup section correctly uses `NOW() - INTERVAL 90 DAY`, which is valid MySQL syntax.
- All other SQL syntax, including CREATE TABLE, CREATE VIEW, UPDATE, DELETE, and ALTER TABLE statements, is correct and current for MySQL 5.7+/8.0.
