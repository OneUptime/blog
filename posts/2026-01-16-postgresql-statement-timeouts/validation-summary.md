# Validation Summary: How to Prevent Runaway Queries with Statement Timeouts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL configuration and SQL commands
- PostgreSQL timeout settings: `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`
- `pg_stat_statements`
- Python with psycopg2
- Node.js with node-postgres (`pg`)
- Java with pgJDBC

## Sources Consulted
- PostgreSQL Client Connection Defaults: https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL `SET` command: https://www.postgresql.org/docs/current/sql-set.html
- PostgreSQL configuration setting precedence: https://www.postgresql.org/docs/current/config-setting.html
- PostgreSQL `pg_stat_statements`: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL `pg_reload_conf()`: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL libpq connection parameters: https://www.postgresql.org/docs/current/libpq-connect.html
- psycopg2 connection and error documentation: https://www.psycopg.org/docs/module.html and https://www.psycopg.org/docs/errors.html
- node-postgres Pool API: https://node-postgres.com/apis/pool
- pgJDBC connection options: https://jdbc.postgresql.org/documentation/use/

## Issues Found
- The post stated that PostgreSQL has three main timeout settings. PostgreSQL has additional timeout settings in current releases, so this was changed to say the guide focuses on three commonly used settings.
- The server-wide `postgresql.conf` example omitted PostgreSQL's documented caveat that setting `statement_timeout` globally is not recommended when workloads need different limits. Added a short warning and recommended per-database, per-role, or application-level settings where appropriate.
- The `SET LOCAL statement_timeout` session example did not show a transaction. PostgreSQL documents that `SET LOCAL` outside a transaction only emits a warning and has no effect, so the example now includes `BEGIN` and `COMMIT`.
- The psycopg2 "per-query" example used session-level `SET`, which could persist longer than intended. Updated it to use `SET LOCAL` inside a transaction context.
- The node-postgres per-query helper used session-level `SET` on a pooled client and released it without resetting the setting, which could leak the timeout to later pool users. Updated it to use a transaction-scoped setting via `set_config(..., true)` with commit/rollback handling.
- The Java snippet used `ResultSet` without importing it. Added `import java.sql.ResultSet;`.
- The Python retry snippet referenced `errors.QueryCanceled` without importing `errors` in that code block. Added `from psycopg2 import errors`.
- The PL/pgSQL "Per-Query Timeout Wrapper" was technically misleading because setting `statement_timeout` inside a server-side function does not create an independent timeout for each dynamic query issued by that function. Replaced it with a transaction-scoped, client-issued `SET LOCAL` example.

## Review Notes
The `pg_stat_statements` examples are useful for finding slow query patterns, but they should not be interpreted as a complete timeout event log. PostgreSQL server logs or application-level error handling remain the better source for actual timeout occurrences.
