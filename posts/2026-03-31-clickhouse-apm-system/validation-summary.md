# Validation Summary: How to Build an APM System with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree engines)
- SQL (ClickHouse dialect)
- APM / Distributed tracing concepts (spans, traces, metrics)

## Sources Consulted
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse data types (LowCardinality, DateTime64, Map): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse aggregate functions (quantile, quantiles, countIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse date functions (toYYYYMMDD, toYYYYMM, toStartOfMinute): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse materialized views and -State combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found
No technical issues found.

All DDL and DML statements use valid ClickHouse syntax:
- Table definitions use appropriate types for APM workloads (`LowCardinality` for repetitive strings, `DateTime64(3)` for millisecond precision, `Map(String, String)` for attributes/tags).
- The `quantile(level)(column)` parametric aggregate syntax is correct.
- The `AggregatingMergeTree` materialized view correctly uses `-State` combinators (`quantilesState`, `countState`) paired with a compatible `ORDER BY` key.
- `PARTITION BY toYYYYMMDD(...)` / `toYYYYMM(...)` are valid partitioning expressions.
- `INTERVAL n HOUR/MINUTE` arithmetic with `now()` is valid.
- `countIf(error = 1)` is a valid conditional aggregate.

## Review Notes
- The materialized view reads from `apm_spans` and stores aggregate states; consumers querying it should use `quantilesMerge()` and `countMerge()` combinators (not shown in the post). This is correct behavior for `-State` aggregation, but users unfamiliar with the pattern may need to consult the ClickHouse docs to read the results back.
- The `status_code` column is defined but not referenced in any query — harmless, just unused.
- Partitioning spans per day (`toYYYYMMDD`) can produce many partitions at high ingestion rates; `toYYYYMM` or `toStartOfHour`-based partitioning might be preferable depending on retention. This is a design trade-off rather than a correctness issue.
- For production APM workloads, a `TTL` clause on the spans/metrics tables would typically be added for data retention; not included here but out of scope for the tutorial.
