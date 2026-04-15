# Validation Summary: How to Use Primary Keys vs Sorting Keys in MergeTree Tables

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse MergeTree engine family
- ClickHouse SQL DDL (CREATE TABLE, ORDER BY, PRIMARY KEY)
- ClickHouse system tables (system.tables)
- ClickHouse sparse primary index architecture

## Sources Consulted
- ClickHouse official documentation: MergeTree engine family — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation: Primary Keys and Indexes in Queries — https://clickhouse.com/docs/en/guides/best-practices/sparse-primary-indexes
- ClickHouse official documentation: system.tables — https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse official documentation: CREATE TABLE syntax — https://clickhouse.com/docs/en/sql-reference/statements/create/table

## Issues Found

1. **"These two concepts are independent"** — Changed to "distinct but related." PRIMARY KEY must be a prefix of ORDER BY, so the two are not independent; they are separate concepts with a strict constraint linking them. Using "independent" was misleading.

2. **"fewer index marks"** — Changed to "smaller index entries per mark." A shorter primary key does not reduce the number of index marks (which is determined by `index_granularity` and the total row count). It reduces the amount of data stored per mark entry (fewer column values), resulting in a smaller in-memory index. The original wording incorrectly implied that the mark count changes.

3. **"The full sorting key still enables granule-level skipping via the longer ORDER BY"** — Changed to explain that the sorting key provides data locality for columns beyond the primary key. Granule-level skipping (mark selection) is performed using the primary index, not the sorting key. The additional ORDER BY columns ensure data is physically clustered, which improves read efficiency for filters on those columns, but this is a data layout benefit, not an index-based skipping mechanism.

## Review Notes
- All SQL syntax examples are correct and use valid ClickHouse DDL.
- The `system.tables` query correctly references the `sorting_key` and `primary_key` columns.
- The explanation of ReplacingMergeTree/SummingMergeTree deduplication by the full ORDER BY key is accurate.
- The error example (`PRIMARY KEY (user_id)` with `ORDER BY (ts, user_id)`) correctly demonstrates a non-prefix violation.
- The guidance on when to use a shorter PRIMARY KEY vs equal keys is sound and practical.
