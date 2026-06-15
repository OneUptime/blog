# Validation Summary: How to Declare and Use Variables in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- PL/pgSQL
- Common Table Expressions (CTEs)
- PostgreSQL configuration settings via `set_config` and `current_setting`

## Sources Consulted
- PostgreSQL Documentation: PL/pgSQL declarations - https://www.postgresql.org/docs/current/plpgsql-declarations.html
- PostgreSQL Documentation: PL/pgSQL basic statements, `SELECT INTO`, and dynamic `EXECUTE` - https://www.postgresql.org/docs/current/plpgsql-statements.html
- PostgreSQL Documentation: PL/pgSQL control structures, `RETURN NEXT`, loops, and exception diagnostics - https://www.postgresql.org/docs/current/plpgsql-control-structures.html
- PostgreSQL Documentation: PL/pgSQL errors and messages / `RAISE` formatting - https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html
- PostgreSQL Documentation: `DO` anonymous blocks - https://www.postgresql.org/docs/current/sql-do.html
- PostgreSQL Documentation: configuration setting functions `set_config` and `current_setting` - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL Documentation: `WITH` queries / Common Table Expressions - https://www.postgresql.org/docs/current/queries-with.html

## Issues Found
- The `RAISE NOTICE` example in the `DO` block used `%%` where a third value placeholder was intended. In PL/pgSQL `RAISE`, `%%` emits a literal percent sign and does not consume an argument, so the original example had too many arguments for the format string. Changed it to `Inactive ratio: % percent`.
- The transaction-local `set_config` example set `myapp.batch_size` with `is_local = true` before `BEGIN`. A local setting only applies during the current transaction, so it would be gone before the later transaction in typical autocommit use. Moved the setting inside the transaction and updated the final comment to refer to both variables.
- The multiple-assignment example assigned `email` into a `RECORD` variable as part of a scalar target list. PL/pgSQL supports a record variable as the whole `SELECT INTO` target, or a list of scalar variables/fields. Replaced the record target with a second text variable.
- The loop example used `current_user` as a record variable name. `CURRENT_USER` is a PostgreSQL special SQL expression/keyword, so the example is clearer and less collision-prone with `user_rec`. Renamed the loop variable and references.

## Review Notes
The examples rely on illustrative application tables such as `users`, `orders`, `order_items`, and `audit_log`; their column names and types must exist for the snippets to run unchanged. `psql` was not installed in the local workspace, so examples were reviewed against official PostgreSQL documentation rather than executed locally.
