# Validation Summary: How to Use NULLIF() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (NULLIF, IFNULL, COALESCE, IF, CASE, aggregate functions)

## Sources Consulted
- MySQL 8.0 Reference Manual — Flow Control Functions: https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html#function_nullif
- MySQL 8.0 Reference Manual — Server SQL Modes (ERROR_FOR_DIVISION_BY_ZERO): https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_error_for_division_by_zero
- MySQL 8.0 Reference Manual — Arithmetic Operators: https://dev.mysql.com/doc/refman/8.0/en/arithmetic-functions.html

## Issues Found
1. **Division by zero error claim was inaccurate**: The post stated "Without NULLIF: division by zero causes ERROR 1365" and "With NULLIF: division by zero returns NULL instead of an error." In MySQL, a SELECT with division by zero returns NULL with a **warning** (code 1365), not a query-terminating error. Error 1365 only becomes an actual error during INSERT/UPDATE operations when both `STRICT_TRANS_TABLES` and `ERROR_FOR_DIVISION_BY_ZERO` are in the sql_mode. The NULLIF pattern's real benefit in a SELECT is that it avoids the warning entirely and makes the NULL handling explicit. Fixed the comments to accurately describe the behavior.

## Review Notes
- The claim that "NULLIF() is the logical opposite of IFNULL()" is a common pedagogical simplification found in many MySQL tutorials. They are complementary (one converts a value to NULL, the other converts NULL to a value) but not strict logical opposites. This is acceptable for a tutorial-level post and does not lead to incorrect usage.
- All SQL syntax is correct and follows standard MySQL conventions.
- The CASE equivalence shown (`CASE WHEN expression1 = expression2 THEN NULL ELSE expression1 END`) matches the official MySQL documentation exactly.
- All basic usage examples produce the correct output as annotated.
- The aggregate function examples correctly leverage the fact that aggregate functions like AVG() and COUNT() ignore NULL values.
- The COALESCE + NULLIF combination pattern is correctly demonstrated.
