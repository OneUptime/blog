# Validation Summary: How to Use PREPARE Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (PREPARE, EXECUTE, DEALLOCATE PREPARE statements)
- SQL prepared/parameterized queries
- MySQL stored procedures with prepared statements

## Sources Consulted
- MySQL 8.0 Reference Manual — PREPARE Statement: https://dev.mysql.com/doc/refman/8.0/en/prepare.html
- MySQL 8.0 Reference Manual — EXECUTE Statement: https://dev.mysql.com/doc/refman/8.0/en/execute.html
- MySQL 8.0 Reference Manual — DEALLOCATE PREPARE Statement: https://dev.mysql.com/doc/refman/8.0/en/deallocate-prepare.html
- MySQL 8.0 Reference Manual — Server System Variables (max_prepared_stmt_count): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_prepared_stmt_count

## Issues Found
1. **Incorrect scope for `max_prepared_stmt_count`**: The post stated the limit of 16,382 prepared statements was "per session." This is incorrect — `max_prepared_stmt_count` is a global server variable that limits the total number of prepared statements across *all* sessions on the server, not per individual session. Fixed the bullet point to accurately describe it as a server-wide limit controlled by a global variable.

## Review Notes
- All SQL code examples use correct syntax and would work as described against appropriate table schemas.
- The stored procedure example correctly assigns the procedure parameter to a user-defined variable (`@s`) before using it in `EXECUTE ... USING`, which is required since `USING` only accepts user-defined variables (prefixed with `@`), not local procedure variables.
- The dynamic SQL section appropriately warns about SQL injection risks when constructing queries with table/column names.
- The post correctly notes that `?` placeholders can only substitute data values, not identifiers.
