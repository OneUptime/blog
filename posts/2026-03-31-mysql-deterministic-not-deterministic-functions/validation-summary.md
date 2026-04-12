# Validation Summary: How to Use DETERMINISTIC and NOT DETERMINISTIC in MySQL Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored functions, determinism characteristics)
- MySQL binary logging and replication
- MySQL query optimizer behavior with DETERMINISTIC functions

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE PROCEDURE / CREATE FUNCTION: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — ALTER FUNCTION: https://dev.mysql.com/doc/refman/8.0/en/alter-function.html
- MySQL 8.0 Reference Manual — Binary Logging of Stored Programs: https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html
- MySQL 8.0 Reference Manual — log_bin_trust_function_creators: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_log_bin_trust_function_creators

## Issues Found

### Issue 1: ERROR 1418 incorrectly attributed to STATEMENT binlog format only
- **What was wrong:** The post stated that "MySQL binary logging in `STATEMENT` format requires that stored functions are either `DETERMINISTIC` or declared with `NO SQL` or `READS SQL DATA`." In reality, ERROR 1418 is triggered whenever binary logging is enabled (any format: STATEMENT, ROW, or MIXED), not just STATEMENT format. The check occurs at function creation time based on `log_bin` being ON and `log_bin_trust_function_creators` being OFF.
- **What was changed:** Corrected the paragraph to say "When binary logging is enabled (the default in MySQL 8.0+)" instead of referencing STATEMENT format specifically. Changed the diagnostic command from `SHOW VARIABLES LIKE 'binlog_format'` to `SHOW VARIABLES LIKE 'log_bin'`.
- **Why:** The original text would mislead readers using ROW or MIXED binlog formats into thinking they wouldn't encounter ERROR 1418, when in fact they would.

### Issue 2: Invalid ALTER FUNCTION syntax for DETERMINISTIC characteristic
- **What was wrong:** The post showed `ALTER FUNCTION get_product_price NOT DETERMINISTIC READS SQL DATA;` as a way to fix the error. However, per the MySQL ALTER FUNCTION documentation, the `DETERMINISTIC` / `NOT DETERMINISTIC` characteristic is NOT supported by ALTER FUNCTION — it can only be set at CREATE FUNCTION time. The ALTER FUNCTION syntax only supports COMMENT, LANGUAGE SQL, data-access characteristics (CONTAINS SQL, NO SQL, READS SQL DATA, MODIFIES SQL DATA), and SQL SECURITY.
- **What was changed:** Removed `NOT DETERMINISTIC` from the ALTER FUNCTION example (leaving only the valid `READS SQL DATA` part) and added a note explaining that DETERMINISTIC/NOT DETERMINISTIC can only be set when creating the function.
- **Why:** The original command would produce a syntax error in MySQL.

## Review Notes
- The `binlog_format` system variable is deprecated as of MySQL 8.0.34 and removed in MySQL 9.0 (only ROW format is supported). This does not affect the post's content since the references to binlog_format were removed as part of the fix.
- The post could benefit from mentioning `log_bin_trust_function_creators` as an alternative way to bypass the ERROR 1418 restriction, though this is not a technical error — just additional context that could be helpful.
