# Validation Summary: How to Validate Data Integrity After AWS Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS S3
- AWS migration validation concepts
- PostgreSQL
- Python
- boto3
- psycopg2
- pandas
- Mermaid

## Sources Consulted
- PostgreSQL documentation: `pg_stat_user_tables` and `n_live_tup` estimated row counts: https://www.postgresql.org/docs/15/monitoring-stats.html
- PostgreSQL documentation: PL/pgSQL dynamic SQL with `EXECUTE format()` and `%I`: https://www.postgresql.org/docs/13/plpgsql-statements.html
- PostgreSQL documentation: `information_schema.table_constraints`: https://www.postgresql.org/docs/16/infoschema-table-constraints.html
- PostgreSQL documentation: `information_schema.key_column_usage`: https://www.postgresql.org/docs/current/infoschema-key-column-usage.html
- PostgreSQL documentation: aggregate functions and `string_agg(... ORDER BY ...)`: https://www.postgresql.org/docs/current/functions-aggregate.html
- PostgreSQL documentation: `UNION`, `ORDER BY`, and `LIMIT` parenthesized subexpressions: https://www.postgresql.org/docs/18/sql-select.html
- PostgreSQL documentation: sequence manipulation functions and `setval`: https://www.postgresql.org/docs/14/functions-sequence.html
- Boto3 documentation: S3 `list_objects_v2` response fields including object `Size`: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_objects_v2.html
- Boto3 documentation: paginators and `get_paginator('list_objects_v2')`: https://docs.aws.amazon.com/boto3/latest/guide/paginators.html
- Psycopg 2 documentation: safe SQL composition with `psycopg2.sql.Identifier`: https://www.psycopg.org/docs/sql.html
- pandas documentation: `DataFrame.equals`: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.equals.html
- Python documentation: `os.walk`: https://docs.python.org/3/library/os.html#os.walk

## Issues Found
- The exact PostgreSQL row-count block used an unqualified table name in dynamic SQL. I changed it to quote both schema and table with `format('%I.%I', ...)`, added `schema_name` to the temporary result table, and truncated the temp table before inserting results so rerunning the block in the same session does not duplicate rows.
- The file-count Python example imported `defaultdict` but did not use it. I removed the unused import.
- The constraint comparison query joined `table_constraints` to `key_column_usage` only by constraint name. I changed the join to include constraint catalog, schema, table schema, and table name, and made it a `LEFT JOIN` so table-level constraints without key-column rows are still visible.
- The Python checksum sampling example described random/seeded sampling, but the code used deterministic modulo sampling and no seed. I corrected the wording, used `psycopg2.sql.Identifier` for table and column identifiers, added a `GREATEST(..., 1)` stride to avoid modulo-by-zero on small tables, added deterministic ordering before `LIMIT`, and parameterized the sample size.
- The boundary-record SQL used `ORDER BY` and `LIMIT` directly inside `UNION` operands. PostgreSQL requires those clauses to be attached to parenthesized subexpressions, so I wrapped each branch in parentheses.

## Review Notes
The examples are illustrative and still assume PostgreSQL integer-like ID columns for modulo sampling, comparable source and target schemas, and already-created database connections where shown. For very large tables, full-table `string_agg` checksums can be memory-intensive; the post already recommends sampling for large tables.
