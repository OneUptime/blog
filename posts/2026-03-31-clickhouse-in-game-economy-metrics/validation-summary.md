# Validation Summary: How to Track In-Game Economy Metrics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree table engine, SQL queries)
- ClickHouse aggregate functions (`sumIf`, `avg`, `quantile`, `count`, `uniq`)
- ClickHouse date/time functions (`toDate`, `today`, `toStartOfWeek`)
- ClickHouse window functions (`sum(count()) OVER ()`)
- ClickHouse type system (`DateTime`, `UInt64`, `UInt32`, `Int64`, `LowCardinality(String)`, `Date`)

## Sources Consulted
- ClickHouse SQL reference: https://clickhouse.com/docs/en/sql-reference
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse conditional functions (`multiIf`): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found
No technical issues found.

All SQL is syntactically correct and uses valid ClickHouse functions and types:
- The `CREATE TABLE` statement uses valid MergeTree syntax with appropriate `PARTITION BY` and `ORDER BY` clauses.
- `Date DEFAULT toDate(event_time)` is a valid default expression.
- `sumIf`, `quantile(0.50)(...)`, `quantile(0.95)(...)`, `uniq`, `multiIf`, `toStartOfWeek`, and the `sum(count()) OVER ()` window expression are all valid ClickHouse constructs.
- `LowCardinality(String)` is appropriate for low-cardinality categorical columns.

## Review Notes
- The "Inflation Index" query computes per-player daily net transaction sums (not cumulative lifetime wealth) and averages those across players by date. The SQL itself runs correctly, but readers should note that "balance" in this context is the net daily flow, not a running-sum wealth measure. For true running-balance inflation tracking, a cumulative sum (e.g., via an ordered window or a materialized view) would be more accurate. This is a modelling choice rather than a technical error, so no change was made.
- `PARTITION BY date` partitions by day. For high-volume games, monthly partitions (e.g., `toYYYYMM(date)`) may scale better — worth noting for future iterations, but not incorrect.
- The post uses `abs(amount)` assuming `spend` transactions are stored as negative values and `earn` as positive; this convention is implied but not explicitly stated in the post. Readers should ensure their ingestion pipeline matches.
