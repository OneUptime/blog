# Validation Summary: How to Use Stored Procedures in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- PL/pgSQL
- SQL stored procedures
- PostgreSQL transaction control
- PostgreSQL security definer permissions

## Sources Consulted
- PostgreSQL documentation: CREATE PROCEDURE - https://www.postgresql.org/docs/current/sql-createprocedure.html
- PostgreSQL documentation: CALL - https://www.postgresql.org/docs/current/sql-call.html
- PostgreSQL documentation: PL/pgSQL Transaction Management - https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL documentation: PL/pgSQL Control Structures and Exception Handling - https://www.postgresql.org/docs/current/plpgsql-control-structures.html
- PostgreSQL documentation: PL/pgSQL Errors and Messages - https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html
- PostgreSQL documentation: System Information Functions - https://www.postgresql.org/docs/current/functions-info.html
- PostgreSQL documentation: CREATE FUNCTION and SECURITY DEFINER guidance - https://www.postgresql.org/docs/current/sql-createfunction.html

## Issues Found
- The procedures vs functions table said functions must return a value. PostgreSQL functions can return `void`, but they must declare a return type. Updated the table to avoid implying every function returns a useful value.
- The transfer example deducted funds before verifying that the recipient update affected a row. Added an `IF NOT FOUND` check after the recipient update so a missing recipient raises an exception and rolls back the transfer.
- The transaction-control explanation omitted PostgreSQL's top-level `CALL` restriction. Added a sentence noting that transaction control in procedures is only allowed when the procedure is called at the top level, not inside an explicit transaction block.
- The "Savepoints in Procedures" section was inaccurate because PL/pgSQL does not support explicit savepoint commands inside PL/pgSQL; exception blocks provide subtransaction behavior. Renamed the section and comments to describe exception blocks for partial rollbacks.
- The `SECURITY DEFINER` example used `current_user` to identify the caller. In a security definer routine, `current_user` is the effective owner, not the original caller. Changed caller checks and audit logging to use `session_user`.
- The security definer example set `search_path` to only `public`. PostgreSQL's security definer guidance recommends placing `pg_temp` last to avoid temporary-object shadowing. Updated it to `SET search_path = public, pg_temp`.

## Review Notes
`psql` is not installed in this workspace, so the snippets were not executed locally. The review was performed against current official PostgreSQL documentation. The examples are still schema-dependent and assume the referenced tables, columns, constraints, and roles already exist.
