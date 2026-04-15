# Validation Summary: How to Use Primary Key Index in ClickHouse MergeTree

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse SQL (CREATE TABLE, EXPLAIN, system tables)
- ClickHouse primary key / sparse index architecture

## Sources Consulted
- ClickHouse official documentation: MergeTree engine family — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation: Primary Keys and Indexes — https://clickhouse.com/docs/en/optimize/sparse-primary-indexes
- ClickHouse official documentation: EXPLAIN statement — https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse official documentation: system.parts table — https://clickhouse.com/docs/en/operations/system-tables/parts

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and uses current ClickHouse types and clauses (`UInt32`, `DateTime`, `LowCardinality(String)`, `Float64`, `MergeTree()`, `ORDER BY`, `PRIMARY KEY`, `SETTINGS`).
- The explanation that PRIMARY KEY must be a prefix of ORDER BY is correctly demonstrated.
- The `EXPLAIN indexes = 1` output description mentions `Parts: N/M` which is accurate; the output also includes `Granules: N/M` which is an even more granular indicator of index effectiveness, but the post's guidance is sufficient for readers to interpret the output.
- The `system.parts` query using `primary_key_bytes_in_memory` and `formatReadableSize` is correct.
- The default `index_granularity` of 8192 is accurately stated.
- The post correctly notes that ClickHouse primary keys do not enforce uniqueness, which is a common point of confusion for users coming from traditional RDBMS backgrounds.
