# Validation Summary: How to Fix 'duplicate key value violates unique constraint' in PostgreSQL

## Status
validated

## Post Type
Troubleshooting guide / SQL tutorial

## Technologies Covered
- PostgreSQL
- SQL
- PostgreSQL sequences and identity columns
- PostgreSQL `ON CONFLICT`
- PostgreSQL `COPY`
- PostgreSQL advisory locks
- Python psycopg2 error handling

## Sources Consulted
- PostgreSQL 18 constraints documentation: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL 18 `INSERT` documentation, including `ON CONFLICT`: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL 18 sequence manipulation functions: https://www.postgresql.org/docs/current/functions-sequence.html
- PostgreSQL 18 `CREATE TABLE` documentation, including identity columns and `LIKE`: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 18 `COPY` documentation: https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL 18 advisory lock functions: https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL 18 error codes appendix: https://www.postgresql.org/docs/current/errcodes-appendix.html
- psycopg2 2.9 error classes documentation: https://www.psycopg.org/docs/errors.html

## Issues Found
- The sequence reset example used `COALESCE(MAX(id), 0)` with `setval(..., true)`. For a standard sequence with a minimum value of 1, setting the value to 0 can fail on an empty table. I changed the example to set the sequence to 1 with `is_called = false` for empty tables, and to `MAX(id)` with `is_called = true` for non-empty tables.
- The sequence verification comment said `last_value` and `max_id` should match unconditionally. I changed it to say this applies to non-empty tables, because the empty-table reset intentionally leaves `last_value` at 1 while the next `nextval` still returns 1.
- The bulk-import staging example used `CREATE TEMP TABLE users_staging (LIKE users INCLUDING ALL)`, which can copy unique constraints/indexes into the staging table and cause duplicate CSV rows to fail before the final `ON CONFLICT` step. I changed the staging table to define only the imported columns without unique constraints.
- The bulk-import `INSERT ... SELECT ... ON CONFLICT DO UPDATE` example did not account for duplicate keys within the staging table. PostgreSQL does not allow one deterministic `ON CONFLICT DO UPDATE` statement to affect the same target row more than once, so duplicate source rows can raise a cardinality violation. I changed the example to use `SELECT DISTINCT ON (email)` before the `ON CONFLICT` clause.
- The identity-column example's error comment was imprecise. I updated it to match PostgreSQL's behavior for inserting an explicit value into a `GENERATED ALWAYS AS IDENTITY` column without `OVERRIDING SYSTEM VALUE`.

## Review Notes
The remaining SQL and Python examples are technically sound for the stated purpose. The "check before insert" pattern can still race under concurrent writers, so `ON CONFLICT` remains the better write path when the insert itself must be race-safe.
