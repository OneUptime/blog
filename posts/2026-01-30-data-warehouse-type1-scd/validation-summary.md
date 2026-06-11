# Validation Summary: How to Implement Type 1 SCD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Data warehouse dimensional modeling
- Slowly Changing Dimensions Type 1
- SQL MERGE / UPSERT patterns
- PostgreSQL INSERT ON CONFLICT and MERGE
- MySQL INSERT ON DUPLICATE KEY UPDATE
- SQL Server transaction handling and HASHBYTES
- dbt incremental models
- Snowflake and BigQuery MERGE semantics

## Sources Consulted
- PostgreSQL MERGE documentation: https://www.postgresql.org/docs/current/sql-merge.html
- PostgreSQL 15 release notes: https://www.postgresql.org/docs/15/release-15.html
- MySQL INSERT ... ON DUPLICATE KEY UPDATE documentation: https://dev.mysql.com/doc/refman/9.7/en/insert-on-duplicate.html
- dbt incremental model documentation: https://docs.getdbt.com/docs/build/incremental-models
- dbt incremental strategy documentation: https://docs.getdbt.com/docs/build/incremental-strategy
- SQL Server HASHBYTES documentation: https://learn.microsoft.com/en-us/sql/t-sql/functions/hashbytes-transact-sql
- BigQuery MERGE / DML documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- Snowflake MERGE documentation: https://docs.snowflake.com/en/sql-reference/sql/merge

## Issues Found
- PostgreSQL support for MERGE was misstated. The post said PostgreSQL does not support MERGE directly; this was updated to state that PostgreSQL 15 and later support MERGE while INSERT ON CONFLICT remains a concise UPSERT option.
- The generic MERGE example generated surrogate keys with `MAX(customer_key) + 1`, which can fail for multi-row inserts and concurrent loads. The table example now uses generated identity syntax and the MERGE insert omits `customer_key`.
- Change detection examples used `<>`, which misses changes involving NULL values. The MERGE, PostgreSQL, and dbt macro examples now use null-safe `IS DISTINCT FROM` comparisons where appropriate.
- The MySQL example used the deprecated `VALUES()` function in `ON DUPLICATE KEY UPDATE`. It now uses the derived-table alias pattern recommended by MySQL documentation for INSERT ... SELECT upserts.
- The dbt incremental predicate compared source `modified_date` to target ETL `updated_at`, which can skip records when those timestamps have different meanings. The model now stores `source_modified_at` and uses it as the incremental watermark.
- The checksum example used deprecated SQL Server MD5 hashing and attempted numeric modulo arithmetic on `HASHBYTES`, which returns `varbinary`. It now stores a `VARBINARY(32)` SHA2_256 checksum and compares the binary hash directly.
- The parallel chunking example attempted modulo arithmetic on `HASHBYTES`. It now uses SQL Server `CHECKSUM(customer_id)` for the partition expression.
- The SQL Server transaction example used ineffective row-count validation and legacy error handling. It now uses `TRY` / `CATCH`, rollback on error, and `THROW`.
- Added caveats where syntax is database-specific, including identity columns and covering index `INCLUDE` syntax.

## Review Notes
The post is technically relevant and useful after corrections. Some examples remain intentionally illustrative across multiple SQL dialects; production implementations should still be adapted to the specific warehouse syntax, supported dbt adapter features, and source-system timestamp semantics.
