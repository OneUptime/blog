# Validation Summary: How to Store and Query Sparse Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, column codecs, Nullable, Map, LowCardinality)
- SQL (DDL, DML, aggregate functions)

## Sources Consulted
- ClickHouse documentation on Nullable type: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse documentation on Map type: https://clickhouse.com/docs/en/sql-reference/data-types/map
- ClickHouse documentation on LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation on column compression codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse documentation on Delta, Gorilla, and ZSTD codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#specialized-codecs
- ClickHouse documentation on mapContains and mapKeys functions: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions
- ClickHouse documentation on rowNumberInAllBlocks: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#rownumberinallblocks
- ClickHouse documentation on arithmetic operators (division returns Float64): https://clickhouse.com/docs/en/sql-reference/operators#arithmetic

## Issues Found
1. **Broken JOIN using `rowNumberInAllBlocks()`**: In the "Using a Separate Sparse Attribute Table" section, the JOIN condition used `e.rowNumberInAllBlocks() = a.event_id`. The `rowNumberInAllBlocks()` function returns a sequential row number during query execution that is not stable across queries — it depends on data insertion order, merge state, and query plan. It should never be used as a foreign key for joins. **Fix**: Added an `event_id UInt64` column to the `user_events` table definition, included event_id values in the INSERT statements, and changed the JOIN condition to `e.event_id = a.event_id`.

## Review Notes
- The post correctly notes that Map columns cannot be indexed directly, which is an important tradeoff.
- The compression codec examples are well-chosen: Delta for sequential IDs and timestamps, Gorilla for floating-point metrics, and high-level ZSTD for sparse nullable columns.
- The sparsity measurement query works correctly because ClickHouse's `/` operator between integers returns Float64, avoiding the integer division trap common in other databases.
- The post could mention `Tuple` as another option for semi-structured sparse data, but this is not an error.
