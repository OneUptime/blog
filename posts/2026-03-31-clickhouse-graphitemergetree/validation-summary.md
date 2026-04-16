# Validation Summary: How to Use GraphiteMergeTree in ClickHouse for Metrics Rollup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (GraphiteMergeTree table engine)
- SQL (ClickHouse dialect)
- Graphite metrics protocol
- XML rollup configuration (`config.xml`)
- `carbon-clickhouse` (go-graphite receiver)

## Sources Consulted
- [ClickHouse GraphiteMergeTree documentation](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/graphitemergetree)
- [ClickHouse Graphite.cpp source](https://github.com/ClickHouse/ClickHouse/blob/master/src/Processors/Merges/Algorithms/Graphite.cpp)
- [go-graphite/carbon-clickhouse](https://github.com/go-graphite/carbon-clickhouse)
- [graphite-clickhouse aggregation docs](https://github.com/go-graphite/graphite-clickhouse/blob/master/doc/aggregation.md)

## Issues Found
1. **Incorrect receiver name** — The original post referenced `carbonClickHouseReceiver`, which is not an actual component. The canonical Graphite-to-ClickHouse bridge is `carbon-clickhouse` from the `go-graphite` organization. Replaced with a link to the real project.
2. **Incorrect time expression in INSERT example** — The original expression `now() - (3600 - number * 10)` combined with `FROM numbers(360 * 3)` (1080 rows) produced timestamps ranging from one hour in the past to roughly two hours in the future, contradicting the "last few hours" comment. Changed to `now() - number * 10` so the 1080 generated rows span three hours into the past at 10-second resolution, matching the (adjusted) comment.

## Review Notes
- The version column name `Timestamp` used in the schema is correct — it matches the ClickHouse default for `version_column_name`. The public docs also show `Version` in example CREATE TABLE statements; both work (the name is configurable), but `Timestamp` aligns with the documented default.
- The ClickHouse docs officially enumerate only `min / max / any / avg` as rollup functions, but the engine delegates to `AggregateFunctionFactory`, so `sum` (used in the post's `server.requests.count` pattern) also works in practice and is commonly used in community configs. Left unchanged.
- The table uses `UInt32` for the `Time` column; the official docs example uses `DateTime`. Both are accepted — `UInt32` is treated as Unix timestamp — so no change made.
- `toDateTime(Time)` on a `UInt32` column correctly interprets the value as a Unix timestamp, so `PARTITION BY toYYYYMM(toDateTime(Time))` is valid.
- The tagged metrics example using `metric_name;tag1=value1;tag2=value2` path syntax aligns with Graphite's carbon tag format and ClickHouse's `graphite_tagged` convention.
