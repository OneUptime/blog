# Validation Summary: How to Optimize ClickHouse Queries Using Primary Key Structure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse sparse primary index
- ClickHouse SQL (DDL and query syntax)
- ClickHouse EXPLAIN plan
- ClickHouse system.parts table

## Sources Consulted
- ClickHouse documentation: Primary Keys and Indexes in Queries — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#primary-keys-and-indexes-in-queries
- ClickHouse documentation: Sparse Primary Indexes — https://clickhouse.com/docs/en/optimize/sparse-primary-indexes
- ClickHouse documentation: system.parts table — https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse documentation: EXPLAIN statement — https://clickhouse.com/docs/en/sql-reference/statements/explain

## Issues Found
1. **Inaccurate description of sparse index entries (line 15)**: The post stated "Each entry marks the minimum value for that granule." This is imprecise. The sparse index stores the primary key column values of the **first row** of each granule, not the "minimum value." For composite keys, only the first column's value from the first row coincides with the minimum for that column within the granule; subsequent columns in the key tuple are not necessarily minimums across the granule. Changed to: "Each entry stores the primary key column values of the first row in that granule."

## Review Notes
- The section heading "Queries That Skip the Index" could be misread as "queries that efficiently skip data via the index" rather than the intended meaning of "queries where the index cannot be used." The body comments clarify the intent, so this is a minor readability note rather than a technical error.
- All SQL syntax is valid and uses current ClickHouse conventions.
- The `system.parts` query correctly uses the `marks` column and the `rows / marks` calculation to show effective granule size.
