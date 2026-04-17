# Validation Summary: How to Build Content Publishing Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, materialized views)
- SQL (analytical aggregation queries)

## Sources Consulted
- ClickHouse docs — Data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse docs — MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse docs — AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse docs — Aggregate functions (uniqExact, countIf, uniqExactState): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse docs — Date/Time functions (dateDiff, toYYYYMMDD, toYYYYMM, toDate, now, INTERVAL): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse docs — Materialized views: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse docs — WITH clause / CTEs and JOIN syntax: https://clickhouse.com/docs/en/sql-reference/statements/select/with

## Issues Found
No technical issues found.

## Review Notes
- The `content_events` table schema uses valid ClickHouse types throughout (`DateTime64(3)`, `UUID`, `LowCardinality(String)`, `LowCardinality(FixedString(2))`, `UInt8`, `UInt64`).
- `PARTITION BY toYYYYMMDD(ts)` is valid but produces daily partitions, which can lead to a large number of parts on very high-volume tables; `toYYYYMM(ts)` (monthly) is a more common choice for events tables. Not a correctness issue.
- The engagement-decay query relies on using the SELECT alias `days_since_publish` inside the WHERE clause, which ClickHouse supports.
- Equating "first view timestamp" with "publish date" is an approximation (an article could be published before being viewed), but the query is written consistently with this definition.
- The author-performance `share_rate_pct` expression will yield `nan`/`inf` when an author has zero views in the window; ClickHouse returns these as values rather than errors, so the query still runs.
- The `article_daily_stats_mv` materialized view uses `SummingMergeTree` together with `uniqExactState(user_id)`. Per the ClickHouse documentation, `SummingMergeTree` aggregates `AggregateFunction` columns using their merge function, so this is technically valid. However, `AggregatingMergeTree` is the more idiomatic choice when the table mixes summed counters with aggregate states, and readers querying `unique_users` will need to wrap it with `uniqExactMerge(unique_users)` at SELECT time. Not incorrect, but worth flagging for readers adopting the pattern.
