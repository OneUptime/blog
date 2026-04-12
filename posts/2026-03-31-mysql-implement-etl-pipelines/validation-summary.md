# Validation Summary: How to Implement ETL Pipelines with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL Stored Procedures
- MySQL Event Scheduler
- MySQL LOAD DATA INFILE
- MySQL Generated Columns
- SQL ETL patterns (staging, transform, load)

## Sources Consulted
- MySQL 8.0 Reference Manual: TRUNCATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html (confirms TRUNCATE is DDL and causes implicit commit)
- MySQL 8.0 Reference Manual: Statements That Cause an Implicit Commit — https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html (VALUES() deprecation in 8.0.20)
- MySQL 8.0 Reference Manual: LOAD DATA Statement — https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: CREATE TABLE Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html

## Issues Found
- **TRUNCATE TABLE inside a transaction (stored procedure section):** `TRUNCATE TABLE stg_orders` was used inside a `START TRANSACTION` / `COMMIT` block with a `ROLLBACK` error handler. In MySQL, `TRUNCATE TABLE` is a DDL statement that causes an implicit commit, meaning it immediately commits any open transaction and cannot itself be rolled back. This broke the transactional guarantee the procedure was designed to provide — if LOAD DATA or subsequent steps failed, the ROLLBACK would not undo the truncation or any work done after it (since the implicit commit ended the transaction). **Fixed** by replacing `TRUNCATE TABLE stg_orders` with `DELETE FROM stg_orders`, which is a DML statement that participates in the transaction and can be rolled back.

## Review Notes
- **`VALUES()` deprecation in `ON DUPLICATE KEY UPDATE`:** Starting in MySQL 8.0.20, using `VALUES(col)` in the `UPDATE` clause of `INSERT ... ON DUPLICATE KEY UPDATE` is deprecated. The modern replacement uses a row alias (e.g., `INSERT INTO ... VALUES (...) AS new ON DUPLICATE KEY UPDATE col = new.col`). This appears in three places in the post. Not changed because `VALUES()` still works in all current MySQL versions and the post does not target a specific version, but authors should be aware this syntax may be removed in a future MySQL release.
- **SQL injection risk in stored procedure:** The file path parameter `p_file` is concatenated directly into a SQL string via `CONCAT()`. This is a potential SQL injection vector. However, `LOAD DATA INFILE` does not support parameterized file paths in MySQL, so there is no clean alternative. In production, callers should validate the file path before passing it to the procedure.
- **Event Scheduler must be enabled:** The `CREATE EVENT` example will only run if the MySQL Event Scheduler is active (`SET GLOBAL event_scheduler = ON`). The post does not mention this prerequisite.
- **`DELETE FROM` performance trade-off:** The fix from `TRUNCATE` to `DELETE FROM` is correct for transactional safety but is slower on large staging tables since it generates row-level undo logs. For very large datasets, an alternative pattern would be to move the `TRUNCATE` outside the transaction and accept that it is non-transactional, or use a separate pre-step.
