# Validation Summary: Why You Should Avoid SELECT * in ClickHouse

## Status
validated

## Post Type
Best Practices Guide

## Technologies Covered
- ClickHouse (columnar storage, MergeTree)
- ClickHouse SQL dialect
- ClickHouse system tables (system.query_log)
- ClickHouse Materialized Views
- PostgreSQL (referenced for contrast as row-oriented)

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse MergeTree storage documentation (column-per-file storage model)
- ClickHouse CREATE MATERIALIZED VIEW syntax documentation
- ClickHouse INSERT SELECT documentation (column matching by position when no column list specified)

## Issues Found
No technical issues found.

- The claim that ClickHouse stores each column in separate files (MergeTree) is accurate.
- The `system.query_log` query uses valid columns (`read_bytes`, `read_rows`, `query`, `type`, `event_time`) and the `QueryFinish` enum value is correct.
- The `CREATE MATERIALIZED VIEW ... TO target AS SELECT ...` syntax is valid ClickHouse syntax.
- The warning about `INSERT INTO ... SELECT *` matching by column position (not name) when no explicit column list is given is accurate ClickHouse behavior.
- The 16x estimate (50 columns / 3 columns ≈ 16.7x) is a reasonable approximation, with the appropriate caveat that it assumes roughly equal column sizes.

## Review Notes
- The post is appropriately scoped and accurate. One minor nuance not mentioned: column read amplification depends on relative column sizes (a wide String column dominates many small numeric columns), so real-world savings can be even larger than column count alone suggests. Not an error — just a refinement.
- The acceptable-use list is reasonable and matches common ClickHouse community guidance.
