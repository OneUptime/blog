# Validation Summary: How to Migrate from PostgreSQL to MySQL

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- PostgreSQL (pg_dump, psql, PL/pgSQL, LANGUAGE sql functions)
- MySQL (LOAD DATA INFILE, mysqlimport, stored functions, InnoDB, AUTO_INCREMENT)
- SQL (schema DDL, data types, information_schema)

## Sources Consulted
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL CREATE FUNCTION documentation: https://www.postgresql.org/docs/current/sql-createfunction.html
- MySQL LOAD DATA INFILE documentation: https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL mysqlimport documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqlimport.html
- MySQL CREATE FUNCTION documentation: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL data type reference: https://dev.mysql.com/doc/refman/8.0/en/data-types.html
- MySQL information_schema.TABLES: https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html

## Issues Found

1. **Incorrect description of pg_dump output format (line 43)**: The text described the `pg_dump --column-inserts` output as "CSV" when it actually produces SQL INSERT statements. Changed "Export data as CSV for easier import into MySQL" to "Export data as SQL INSERT statements for easier import into MySQL."

2. **Inaccurate claim about PostgreSQL function syntax (line 125)**: The text stated "PostgreSQL functions use `PL/pgSQL` syntax" but the accompanying example used `LANGUAGE sql`, not PL/pgSQL. Changed to "PostgreSQL functions use syntax (such as `PL/pgSQL` or `LANGUAGE sql`) that differs from MySQL" to accurately reflect that PostgreSQL supports multiple procedural languages.

3. **Incorrect `DETERMINISTIC` characteristic on MySQL function (line 140)**: The MySQL stored function was declared as `DETERMINISTIC`, but it reads from a table (`orders`), meaning its result changes as data changes. A deterministic function must always return the same result for the same input parameters. Changed to `READS SQL DATA`, which correctly indicates the function reads but does not modify data. Using `DETERMINISTIC` incorrectly can cause issues with statement-based replication.

## Review Notes
- The `TABLE_ROWS` column in `information_schema.TABLES` returns an approximation for InnoDB tables, not an exact count. For precise migration validation, `SELECT COUNT(*) FROM table_name` per table would be more reliable. The post's suggestion to use this query for validation is a common practice but readers should be aware of this caveat.
- The schema conversion section correctly maps PostgreSQL `TIMESTAMP` to MySQL `DATETIME` rather than MySQL `TIMESTAMP`, which is the right choice since MySQL's `TIMESTAMP` type has time zone conversion behavior and a narrower range (1970-2038).
- All CLI commands (`pg_dump`, `psql`, `mysqlimport`, `LOAD DATA INFILE`) use correct flags and syntax.
