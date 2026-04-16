# Validation Summary: How to Migrate from DuckDB to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- DuckDB (embedded analytical database)
- ClickHouse (server-based OLAP database)
- Parquet (data interchange format)
- Amazon S3 (object storage for Parquet export/import)
- Kafka (streaming ingestion via ClickHouse Kafka table engine)
- SQL (DuckDB and ClickHouse dialect translation)

## Sources Consulted
- ClickHouse Kafka engine docs: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse MergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse `file` table function: https://clickhouse.com/docs/sql-reference/table-functions/file
- ClickHouse `s3` table function: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse date/time functions (`toStartOfHour`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse `arrayReduce` and `uniq` aggregate functions: https://clickhouse.com/docs/sql-reference/functions/array-functions, https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- DuckDB `COPY` statement to Parquet: https://duckdb.org/docs/sql/statements/copy
- DuckDB list functions (`list_aggregate`): https://duckdb.org/docs/current/sql/functions/list
- DuckDB `approx_count_distinct`: https://duckdb.org/docs/sql/aggregates

## Issues Found
- **Kafka engine CREATE TABLE was missing column definitions.** The original example defined the Kafka-engine table with no column list, which is invalid SQL — the ClickHouse Kafka engine requires explicit columns (it does not infer them from the format). Added a column list matching the previously defined `page_views` schema so the statement is executable.

## Review Notes
- Type mapping `INTEGER` → `UInt32` is acceptable for `duration_ms` (non-negative by definition); a stricter mapping would be `Int32`, since DuckDB's `INTEGER` is signed 32-bit. Not changed because the post's column clearly stores a non-negative duration.
- `TIMESTAMPTZ` → `DateTime` loses original-timezone context (ClickHouse stores as UTC seconds). Readers needing sub-second precision or explicit timezone handling should consider `DateTime64(3, 'UTC')`. Left as-is since the post is an introductory migration guide.
- `arrayReduce('count', page_list)` is valid, though `length(page_list)` is simpler for raw element counts. Kept verbatim since the post is illustrating the general `list_aggregate` → `arrayReduce` translation pattern.
- ClickHouse also supports `date_trunc('hour', ...)` natively now, but `toStartOfHour` remains idiomatic; no change needed.
