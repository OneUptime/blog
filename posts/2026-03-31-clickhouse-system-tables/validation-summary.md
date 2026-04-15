# Validation Summary: How to Use system.tables in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system.tables system table)
- ClickHouse SQL dialect
- ClickHouse storage engines (MergeTree, View, MaterializedView, Kafka, Buffer)

## Sources Consulted
- ClickHouse official documentation for system.tables: https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse SQL reference for functions (formatReadableSize, now, INTERVAL): https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse FORMAT clause documentation: https://clickhouse.com/docs/en/interfaces/formats

## Issues Found
1. **`lifetime_rows` and `lifetime_bytes` descriptions were misleading.** The blog described these as "Total rows ever written" and "Total bytes ever written," implying they apply to all tables. Per ClickHouse documentation, these columns only track rows/bytes inserted since server start and only for Buffer engine tables. Fixed descriptions to: "Total rows inserted since server start (Buffer tables only)" and "Total bytes inserted since server start (Buffer tables only)."

2. **`comment IS NULL` check was incorrect.** In the "Tables Without Comments" query, the condition `comment = '' OR comment IS NULL` included a dead `IS NULL` branch. The `comment` column is type `String` (non-nullable), so it can never be NULL in ClickHouse — empty strings are the default. Removed the `OR comment IS NULL` clause.

## Review Notes
- All SQL queries use valid ClickHouse syntax and reference real columns with correct types.
- The `formatReadableSize()` function is used correctly throughout.
- The mermaid diagram accurately describes how system.tables metadata relates to table creation.
- The summary's claim that sizes are "pre-aggregated from part metadata" is accurate — total_bytes is rolled up from system.parts and updated periodically, not computed on query.
- The `total_bytes` description as "On-disk compressed bytes" is correct per official docs.
- All engine name string comparisons ('View', 'MaterializedView', '%MergeTree%') use the correct canonical names.
