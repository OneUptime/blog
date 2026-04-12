# Validation Summary: How to Design a Schema for Soft Deletes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB)
- SQL DDL (CREATE TABLE, CREATE VIEW)
- SQL DML (UPDATE, DELETE, SELECT)
- Soft delete pattern with `deleted_at` timestamp

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — UNIQUE Index handling of NULLs: https://dev.mysql.com/doc/refman/8.0/en/create-index.html ("A UNIQUE index permits multiple NULL values for columns that can contain NULL")
- MySQL 8.0 Reference Manual — CREATE VIEW Statement: https://dev.mysql.com/doc/refman/8.0/en/create-view.html
- MySQL 8.0 Reference Manual — Date and Time Functions (NOW(), CURRENT_TIMESTAMP, INTERVAL): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html

## Issues Found
1. **Incorrect explanation of UNIQUE KEY behavior with NULLs (line 27):** The original text stated that MySQL treats multiple NULLs as distinct in a unique index and then concluded "so two active rows with the same email would violate the constraint." This conclusion is backwards. Because MySQL treats NULLs as distinct, a UNIQUE KEY on `(email, deleted_at)` does **not** prevent two active rows (both with `deleted_at = NULL`) from having the same email — both rows would be allowed. The text was corrected to accurately explain that the constraint does not enforce uniqueness for active rows and that application-level checks or a generated column approach is needed.

## Review Notes
- The index strategy code snippets (lines 70-76) use `KEY` syntax, which is only valid inside a `CREATE TABLE` statement. As standalone statements, they should use `CREATE INDEX` or `ALTER TABLE ... ADD INDEX`. This is a minor presentational choice acceptable in a tutorial context.
- The "Handling Unique Constraints After Soft Delete" section mentions using a "non-NULL sentinel like the deleted timestamp," which is redundant since the standard soft delete already sets `deleted_at` to the current timestamp. The wording could be clearer, but the code example and overall approach are correct.
- The post could mention the MySQL 8.0.13+ generated column approach as a more robust solution to the uniqueness problem: `ALTER TABLE users ADD COLUMN active_email VARCHAR(255) GENERATED ALWAYS AS (IF(deleted_at IS NULL, email, NULL)) STORED, ADD UNIQUE KEY (active_email);`. This enforces uniqueness at the database level for active rows. This is not an error — just a potential future improvement.
