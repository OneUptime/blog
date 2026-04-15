# Validation Summary: How to Use system.columns to Inspect Table Schemas in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables, SQL, MergeTree engine family)
- ClickHouse `system.columns` metadata table
- ClickHouse `system.tables` metadata table
- `clickhouse-client` CLI
- `clusterAllReplicas()` distributed query function

## Sources Consulted
- ClickHouse official documentation on system.columns: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse official documentation on MergeTree PRIMARY KEY vs ORDER BY: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#primary-keys-and-indexes-in-queries
- ClickHouse official documentation on ALTER TABLE COMMENT COLUMN: https://clickhouse.com/docs/en/sql-reference/statements/alter/column#comment-column
- ClickHouse official documentation on clusterAllReplicas: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse official documentation on system.tables: https://clickhouse.com/docs/en/operations/system-tables/tables

## Issues Found
1. **Incorrect description of PRIMARY KEY / ORDER BY relationship in Common Pitfalls section.**
   - **What was wrong:** The original text stated: "is_in_primary_key reflects the explicit PRIMARY KEY clause. In MergeTree tables where no PRIMARY KEY is specified, the primary key is derived from the first N columns of ORDER BY, and is_in_sorting_key is more reliable." This was misleading in two ways: (a) when no explicit PRIMARY KEY is specified, the primary key defaults to the **full** ORDER BY key, not just "the first N columns"; (b) it implied `is_in_primary_key` is unreliable without an explicit PRIMARY KEY, when actually both flags are equivalent in that case.
   - **What was changed:** Rewrote the bullet to clarify that without an explicit PRIMARY KEY, both flags are equivalent (since the primary key defaults to the full ORDER BY). The real distinction is when PRIMARY KEY is explicitly set to a prefix of ORDER BY — then `is_in_primary_key` only covers the prefix while `is_in_sorting_key` covers all ORDER BY columns.
   - **Why:** The original wording could mislead readers into thinking `is_in_primary_key` is broken or unreliable in default MergeTree configurations, and incorrectly described the implicit primary key derivation.

## Review Notes
- The `default_kind` column also supports `EPHEMERAL` in newer ClickHouse versions (22.1+). The post lists `DEFAULT`, `MATERIALIZED`, `ALIAS`, or empty, which covers the most common cases but is not exhaustive. This is a minor omission and doesn't affect correctness for most users.
- All SQL queries are syntactically correct and use appropriate ClickHouse functions (`formatReadableSize`, `nullIf`, `hostName`, `clusterAllReplicas`, etc.).
- The bash script for cross-replica comparison is correct, though the use of shell variable interpolation (`${DB}`) inside a `clickhouse-client --query` string works but could be a SQL injection risk in production scripts. This is a security best practice consideration rather than a technical error.
- The `FORMAT PrettyCompactNoEscapes` format specifier is valid in ClickHouse.
- The column types listed in the metadata table are accurate for current ClickHouse versions.
