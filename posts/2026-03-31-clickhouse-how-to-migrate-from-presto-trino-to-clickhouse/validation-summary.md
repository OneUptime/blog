# Validation Summary: How to Migrate from Presto/Trino to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- ClickHouse (MergeTree engine, s3 table function, dictionaries)
- Trino / Presto (CLI, Hive connector, CREATE TABLE AS)
- AWS S3 (as intermediate export format)
- Parquet file format
- SQL (function syntax translation between dialects)

## Sources Consulted
- Trino CLI documentation: https://trino.io/docs/current/client/cli.html
- Trino Hive connector (CREATE TABLE AS with external_location): https://trino.io/docs/current/connector/hive.html
- Trino functions (date_add, regexp_extract, approx_distinct): https://trino.io/docs/current/functions/
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse s3 table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse string functions (extract): https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse aggregate functions (uniq): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse dictionaries (CREATE DICTIONARY, HASHED layout, CLICKHOUSE source): https://clickhouse.com/docs/en/sql-reference/dictionaries

## Issues Found
No technical issues found.

- Trino CLI invocation with `--server`, `--catalog`, `--schema`, `--execute`, and `--output-format TSV` is valid.
- Hive `CREATE TABLE AS` with `external_location` and `format = 'PARQUET'` properties is correct.
- ClickHouse `MergeTree` DDL with `PARTITION BY toYYYYMM(dt)` and `ORDER BY (...)` is syntactically valid.
- The `s3('url', 'key', 'secret', 'Parquet')` function signature matches the documented overload.
- SQL translations are accurate: `date_add('day', -7, current_date)` ↔ `today() - 7`; `regexp_extract(s, p, 1)` ↔ `extract(s, p)` (returns first capture group); `approx_distinct` ↔ `uniq`.
- `CREATE DICTIONARY` with `PRIMARY KEY`, `SOURCE(CLICKHOUSE(TABLE 'dim_pages'))`, `LIFETIME(300)`, and `LAYOUT(HASHED())` is valid; omitting HOST/PORT/DB defaults to the local server/default database, which is acceptable for a minimal example.

## Review Notes
- The "10-100x faster aggregation" claim is a generalization rather than a universal benchmark — actual ratio depends on workload, schema, and deployment. Reasonable as a rule of thumb.
- The Trino export example assumes the session user has write permission to the target S3 path and that the Hive metastore is configured; these prerequisites are implicit.
- The ClickHouse dictionary example would typically also include `DB 'default'` in the SOURCE for clarity in multi-database setups, but it is not strictly required.
- The `s3()` function example passes credentials inline; in production, IAM roles or named collections are preferable, but the inline form is valid and commonly shown in introductory docs.
