# Validation Summary: How to Copy Table Data with INSERT INTO SELECT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (INSERT INTO...SELECT, CREATE TABLE...LIKE, stored procedures)
- SQL DML (INSERT, SELECT, JOIN, GROUP BY, UNION ALL)
- Percona Toolkit (pt-archiver, mentioned in best practices)

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT...SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/insert-select.html)
- MySQL 8.0 Reference Manual: INSERT...ON DUPLICATE KEY UPDATE (https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html)
- MySQL 8.0.20 Release Notes — deprecation of VALUES() in ON DUPLICATE KEY UPDATE (https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html)
- MySQL 8.0 Reference Manual: CREATE TABLE...LIKE (https://dev.mysql.com/doc/refman/8.0/en/create-table-like.html)
- MySQL 8.0 Reference Manual: CREATE PROCEDURE (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)

## Issues Found
1. **Deprecated `VALUES()` in ON DUPLICATE KEY UPDATE**: The "Handling Duplicate Key Errors" section used `VALUES(name)` and `VALUES(price)` in the `ON DUPLICATE KEY UPDATE` clause. The `VALUES()` function in this context has been deprecated since MySQL 8.0.20 (April 2020) and generates deprecation warnings. Per the MySQL documentation, the recommended replacement for INSERT...SELECT is to wrap the SELECT in a subquery with an alias and reference the alias columns. Changed `SELECT id, name, price FROM products ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price)` to `SELECT * FROM (SELECT id, name, price FROM products) AS src ON DUPLICATE KEY UPDATE name = src.name, price = src.price`.

## Review Notes
- The stored procedure `batch_copy()` includes an explicit `COMMIT` after each batch INSERT. With MySQL's default `autocommit = 1`, each INSERT is already auto-committed, making the explicit COMMIT a no-op. However, it correctly communicates intent and works as expected when autocommit is OFF, so this is acceptable.
- The example output timestamps in the "Copying with Transformation" section (`2024-06-01 10:00:00`) are illustrative and will differ based on when the data is actually inserted. This is standard practice for tutorial output examples.
- All SQL syntax is correct for MySQL 8.0+. The CREATE TABLE...LIKE, INSERT...SELECT, DELIMITER usage, and stored procedure syntax are all valid.
- The ROUND(price * 100) computation is safe because `price` is DECIMAL(10,2), so the multiplication is done in exact decimal arithmetic without floating-point precision issues.
