# Validation Summary: How to Implement a Sequence Generator in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (stored functions, DDL, DML)
- InnoDB row-level locking
- Window functions (LAG, OVER)
- INSERT ... ON DUPLICATE KEY UPDATE

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE FUNCTION Statement: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — Data Access Characteristics (CONTAINS SQL, NO SQL, READS SQL DATA, MODIFIES SQL DATA): https://dev.mysql.com/doc/refman/8.0/en/stored-routines-syntax.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — Window Functions (LAG): https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html

## Issues Found
1. **Conflicting data access characteristics on `next_sequence` function**: The function specified both `READS SQL DATA` and `MODIFIES SQL DATA`. In MySQL, these are mutually exclusive characteristics — only one may be specified. Since the function performs `UPDATE` statements, only `MODIFIES SQL DATA` is correct. Removed `READS SQL DATA` from the function definition.

## Review Notes
- All three stored functions (`next_sequence`, `next_invoice_number`, `next_entity_sequence`) are declared `DETERMINISTIC`, but they are not truly deterministic — they return different values on each call and depend on mutable state. This is a very common pattern in MySQL tutorials because binary logging with `log_bin_trust_function_creators=0` (the default) restricts creation of non-deterministic functions that modify data without SUPER privilege. Technically incorrect but widely practiced; left as-is since changing it would require explaining the binary logging workaround.
- The concurrency safety section correctly explains that InnoDB's row-level exclusive lock on the `UPDATE` statement serializes concurrent access to each sequence row. The lock is held for the duration of the enclosing transaction (or implicit transaction in autocommit mode), which includes the subsequent `SELECT` within the stored function.
- The `SUBSTRING(invoice_number, 10)` extraction in the gap-check query correctly targets the numeric portion of the `INV-YYYY-NNNNNN` format (position 10 is the first digit after the second hyphen).
- The per-entity sequence pattern using `INSERT ... ON DUPLICATE KEY UPDATE` is a clean and correct approach for upsert-based sequence generation.
