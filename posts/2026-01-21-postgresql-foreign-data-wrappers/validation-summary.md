# Validation Summary: How to Use PostgreSQL Foreign Data Wrappers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- Foreign Data Wrappers (FDW)
- postgres_fdw
- file_fdw
- mysql_fdw
- SQL

## Sources Consulted
- PostgreSQL documentation: postgres_fdw - https://www.postgresql.org/docs/current/postgres-fdw.html
- PostgreSQL documentation: file_fdw - https://www.postgresql.org/docs/current/file-fdw.html
- EnterpriseDB mysql_fdw documentation - https://github.com/EnterpriseDB/mysql_fdw

## Issues Found
- The postgres_fdw setup example labeled a manual `CREATE FOREIGN TABLE` statement as "Import foreign table." I changed the comment to "Create foreign table" because PostgreSQL uses `IMPORT FOREIGN SCHEMA` for importing foreign table definitions.

## Review Notes
- The `postgres_fdw` and `file_fdw` examples use syntax and options shown in current PostgreSQL documentation.
- The `mysql_fdw` example matches the documented option names for the EnterpriseDB mysql_fdw extension, including `username`, `password`, `dbname`, and `table_name`. This extension must be installed on the PostgreSQL server before `CREATE EXTENSION mysql_fdw` can succeed.
