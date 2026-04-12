# Validation Summary: How to Handle Missing Values in MySQL Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SQL syntax, DDL, DML)
- COALESCE function
- NULL handling (IS NULL, NOT NULL constraints)
- DEFAULT column constraints
- UPDATE with JOIN and correlated subqueries

## Sources Consulted
- MySQL 8.0 Reference Manual: COALESCE function — https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#function_coalesce
- MySQL 8.0 Reference Manual: Working with NULL Values — https://dev.mysql.com/doc/refman/8.0/en/working-with-null.html
- MySQL 8.0 Reference Manual: UPDATE syntax — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: ALTER TABLE syntax — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: CREATE TABLE syntax — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: Data Type Default Values — https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html

## Issues Found
No technical issues found.

## Review Notes
- The post description mentions `IFNULL` as a covered topic, but the post itself never demonstrates `IFNULL`. This is not a technical error but a minor content gap — `IFNULL(expr1, expr2)` is a MySQL-specific two-argument alternative to `COALESCE` that could be briefly shown alongside `COALESCE`.
- The forward-fill UPDATE query references the `readings` table both as the update target and within a derived table subquery. This works correctly in MySQL 5.7+ because the derived table is materialized before the update executes, avoiding the "can't specify target table for update in FROM clause" error (error 1093). However, if `prev_value` resolves to NULL (no prior non-NULL reading exists), the row remains NULL — expected behavior but worth noting for readers working with sparse time-series data.
- The `TEXT DEFAULT NULL` in the CREATE TABLE example is correct for all MySQL versions. Note that TEXT columns cannot have a non-NULL literal default in MySQL versions before 8.0.13 (which introduced expression defaults).
