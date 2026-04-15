# Validation Summary: ClickHouse vs QuestDB for Time-Series Data

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- ClickHouse (OLAP database, MergeTree engine, DoubleDelta/Gorilla codecs, DateTime64, LowCardinality, TTL)
- QuestDB (time-series database, InfluxDB Line Protocol, SAMPLE BY, dateadd)
- SQL (DDL, aggregation queries, time-series downsampling)

## Sources Consulted
- ClickHouse documentation on codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse documentation on DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation on MergeTree TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse documentation on quantile function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- QuestDB documentation on SAMPLE BY: https://questdb.io/docs/reference/sql/sample-by/
- QuestDB documentation on dateadd: https://questdb.io/docs/reference/function/date-time/#dateadd
- QuestDB documentation on ILP ingestion: https://questdb.io/docs/reference/api/ilp/overview/

## Issues Found
No technical issues found.

## Review Notes
- The ClickHouse CREATE TABLE example uses correct codec chaining (DoubleDelta + ZSTD for timestamps, Gorilla + ZSTD for floats), which is a well-established best practice for time-series data.
- The QuestDB SAMPLE BY query correctly demonstrates the native time-series downsampling syntax.
- The `quantile(0.99)(value)` syntax is specific to ClickHouse's aggregate function calling convention and is correctly shown.
- QuestDB's `dateadd('d', -1, now())` uses the correct parameter order (period, offset, timestamp).
- The post's claim of QuestDB exceeding 1 million rows/second ingestion is consistent with QuestDB's published benchmarks, though actual performance varies by hardware and schema.
- The characterization of QuestDB's SQL as "PostgreSQL-compatible" refers to its wire protocol compatibility; the SQL dialect itself has extensions and some differences from standard PostgreSQL.
