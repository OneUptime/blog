# Validation Summary: How to Use READS SQL DATA and NO SQL in MySQL Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored functions, data-access characteristics)
- MySQL binary logging / statement-based replication
- MySQL DELIMITER usage for stored routines

## Sources Consulted
- MySQL 8.0 Reference Manual — ALTER FUNCTION Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-function.html
- MySQL 8.0 Reference Manual — CREATE FUNCTION Statement: https://dev.mysql.com/doc/refman/8.0/en/create-function.html
- MySQL 8.0 Reference Manual — Stored Routines and Binary Logging: https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html

## Issues Found

1. **ALTER FUNCTION with NOT DETERMINISTIC (invalid syntax)**: The `ALTER FUNCTION` example included `NOT DETERMINISTIC READS SQL DATA`, but `[NOT] DETERMINISTIC` is not a valid characteristic for `ALTER FUNCTION` — it is only valid in `CREATE FUNCTION`. The MySQL 8.0 docs confirm that ALTER FUNCTION's characteristic clause only supports `COMMENT`, `LANGUAGE SQL`, data-access characteristics, and `SQL SECURITY`. Removed `NOT DETERMINISTIC` from the example and added a note explaining this limitation.

2. **Variable type mismatch in `item_price` function**: The `item_price` function declared its local variable `v` as `INT` but the function returns `DECIMAL(10,2)`. This would silently truncate any fractional part of the price (e.g., `19.99` becomes `19`). Changed the variable declaration to `DECLARE v DECIMAL(10,2)` to match the return type.

3. **Missing DELIMITER in "Combining Characteristics" examples**: The `square` and `item_price` examples used `BEGIN...END` blocks without changing the `DELIMITER` first. In the mysql CLI, the semicolons inside the function body would prematurely terminate the `CREATE FUNCTION` statement. Fixed `square` by removing the unnecessary `BEGIN...END` (single RETURN statement doesn't need it). Fixed `item_price` by adding `DELIMITER //` / `DELIMITER ;` around the definition and expanding it for clarity.

## Review Notes
- The post does not mention the `log_bin_trust_function_creators` system variable, which controls whether ERROR 1418 is enforced. When set to ON, functions can be created without the DETERMINISTIC/NO SQL/READS SQL DATA requirement even with binary logging enabled. This is a valid omission for a focused tutorial but could be mentioned as an advanced note.
- The error message and error code (1418 / HY000) shown in the post are accurate.
- All four data-access characteristics are correctly described in the summary table.
- The replication implications are accurately explained for statement-based binary logging.
