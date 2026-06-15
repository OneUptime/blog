# Validation Summary: How to Implement Audit Trails with Triggers in PostgreSQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL
- PL/pgSQL trigger functions
- PostgreSQL JSONB and GIN indexes
- PostgreSQL custom settings with `SET LOCAL`
- PostgreSQL table partitioning

## Sources Consulted
- PostgreSQL documentation: PL/pgSQL trigger functions, including `NEW`, `OLD`, `TG_OP`, `TG_RELID`, `TG_TABLE_NAME`, `TG_TABLE_SCHEMA`, and row-level AFTER trigger return behavior: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL documentation: `CREATE TRIGGER`: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL documentation: `CREATE FUNCTION` and safe `SECURITY DEFINER` `search_path` usage: https://www.postgresql.org/docs/current/sql-createfunction.html
- PostgreSQL documentation: `SET` and `SET LOCAL` transaction-scoped behavior: https://www.postgresql.org/docs/current/sql-set.html
- PostgreSQL documentation: JSONB indexing with GIN: https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL documentation: declarative table partitioning and primary key requirements on partitioned tables: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL documentation: `COPY`: https://www.postgresql.org/docs/current/sql-copy.html

## Issues Found
- The post said the generic trigger function works with any table, but the implementation requires primary key columns to build the non-null `record_id`. I changed the text to say it works with tables that have a primary key and added an explicit exception when no primary key is present.
- The primary key lookup used `a.attnum = ANY(i.indkey)` with `array_agg(a.attname)`, which does not preserve composite primary key column order. I changed it to unnest `i.indkey` with ordinality and aggregate/order by that ordinality.
- The `record_id` construction for composite primary keys did not explicitly preserve key order. I changed each `string_agg` to unnest `key_columns` with ordinality and order by that ordinality.
- The `SECURITY DEFINER` function did not set a secure `search_path`, leaving unqualified references such as `audit_log` subject to search-path resolution. I added `SET search_path = public, pg_temp` to the function definition, matching PostgreSQL's guidance for security-definer functions.
- The application snippet used `SET LOCAL app.current_user = ...`, which fails because `current_user` is a SQL keyword in that position. I changed it to `SET LOCAL "app.current_user" = ...`.
- The `SET LOCAL` example did not explicitly show a transaction, even though `SET LOCAL` is transaction-scoped. I added `BEGIN` and `COMMIT` around the example operations.
- The performance section claimed AFTER triggers reduce contention because they run after the row is locked. PostgreSQL documentation supports that row-level AFTER trigger return values are ignored, but not the stated contention claim. I changed the comment to say AFTER triggers are appropriate when recording final row state and cannot alter the row through their return value.

## Review Notes
The corrected main trigger, sample table setup, `SET LOCAL` example, and INSERT/UPDATE/DELETE audit flow were smoke-tested successfully against PostgreSQL 18 in Docker. The sensitive-column trigger, partitioned audit table DDL, and queue trigger were also syntax-checked successfully.
