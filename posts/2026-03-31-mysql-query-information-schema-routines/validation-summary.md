# Validation Summary: How to Query INFORMATION_SCHEMA.ROUTINES in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (INFORMATION_SCHEMA)
- Stored Procedures
- Stored Functions
- SQL metadata queries

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA ROUTINES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html)
- MySQL 8.0 Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)
- MySQL 8.0 Reference Manual: Stored Routines and Replication (https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html)

## Issues Found
1. **Incorrect column name `DETERMINISTIC`**: The post used `DETERMINISTIC` as the column name in the Key Columns table and in two SQL queries. The actual column name in `INFORMATION_SCHEMA.ROUTINES` is `IS_DETERMINISTIC`. This would cause "Unknown column" errors if the queries were run as written. Fixed in:
   - Key Columns table: changed `DETERMINISTIC` to `IS_DETERMINISTIC`
   - "Listing All Stored Functions" query: changed `DETERMINISTIC` to `IS_DETERMINISTIC` in the SELECT clause
   - "Finding Non-Deterministic Functions" query: changed `DETERMINISTIC` to `IS_DETERMINISTIC` in both the SELECT clause and the WHERE clause

## Review Notes
- All other column names referenced in the post (`ROUTINE_SCHEMA`, `ROUTINE_NAME`, `ROUTINE_TYPE`, `DATA_TYPE`, `ROUTINE_BODY`, `ROUTINE_DEFINITION`, `DEFINER`, `SECURITY_TYPE`, `SQL_MODE`, `CREATED`, `LAST_ALTERED`) are correct.
- The claim that `ROUTINE_BODY` is always 'SQL' in MySQL is accurate -- MySQL does not support external language routines natively.
- The use of `\G` for vertical output in the "Reading a Routine Definition" query is valid MySQL client syntax.
- The explanation about non-deterministic functions and replication/generated column limitations is accurate.
- The explanation about DEFINER security type running with the creator's privileges is accurate.
- All SQL syntax is correct and the queries would work as expected after the column name fix.
