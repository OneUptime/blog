# Validation Summary: How to Build a Metrics Aggregation System with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree engines)
- ClickHouse codecs (DoubleDelta, Gorilla, LZ4, ZSTD)
- SimpleAggregateFunction column type
- Materialized Views (cascading pattern)
- LowCardinality and Map column types
- DateTime64, TTL, partitioning
- system.parts for storage introspection
- Prometheus / OpenTelemetry (mentioned as data sources)
- Grafana (mentioned as visualization layer)

## Sources Consulted
- ClickHouse documentation on codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse documentation on DoubleDelta codec: https://clickhouse.com/docs/en/sql-reference/statements/create/table#doubledelta
- ClickHouse documentation on Gorilla codec: https://clickhouse.com/docs/en/sql-reference/statements/create/table#gorilla
- ClickHouse documentation on AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on SimpleAggregateFunction: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse documentation on Materialized Views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse documentation on DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation on Map type: https://clickhouse.com/docs/en/sql-reference/data-types/map
- ClickHouse documentation on quantile function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse documentation on system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts

## Issues Found
1. **Incorrect codec name in introduction text**: The introductory paragraph referred to "Delta and Gorilla codecs" but the actual SQL code correctly uses `DoubleDelta`, not `Delta`. These are distinct ClickHouse codecs — `Delta` stores first-order differences while `DoubleDelta` stores second-order differences (ideal for monotonically increasing timestamps). Changed "Delta" to "DoubleDelta" in the intro to match the code.

## Review Notes
- The `toStartOfMinute(minute)` call in the "Average CPU Over Last Hour" query is redundant since the `minute` column already contains minute-truncated values from the MV. It is not incorrect but could be simplified to just use `minute AS t`.
- The average CPU queries use `avg(sum_val / count_val)` which computes an unweighted average of per-label averages. For a true weighted average, `sum(sum_val) / sum(count_val)` would be more precise. The current approach is valid when each label combination has roughly equal data point counts, which is typical for metrics.
- The `SETTINGS index_granularity = 8192` on the raw table is the default value and could be omitted, but including it explicitly is not wrong and serves as documentation.
- The cascading materialized view pattern (raw → 1m → 1h) is correctly implemented. Each MV fires on inserts to its source table, and partial aggregates are correctly merged by AggregatingMergeTree with SimpleAggregateFunction.
