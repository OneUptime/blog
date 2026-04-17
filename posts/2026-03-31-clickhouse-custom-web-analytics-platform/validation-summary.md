# Validation Summary: How to Build a Custom Web Analytics Platform with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, Materialized Views, TTL)
- SQL (ClickHouse dialect)
- ClickHouse data types: DateTime64, UUID, LowCardinality(String), UInt32
- Aggregate state functions: minState, maxState, countState, anyState
- HTTP/REST ingestion (curl)

## Sources Consulted
- ClickHouse documentation: https://clickhouse.com/docs
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse AggregatingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse GROUP BY semantics: https://clickhouse.com/docs/en/sql-reference/statements/select/group-by
- ClickHouse data types (DateTime64, UUID, LowCardinality): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
1. **Bounce rate query — invalid GROUP BY with aggregate expression.** The inner subquery had `GROUP BY session_id, day` where `day` was defined as `toDate(min(event_time))`. ClickHouse (like standard SQL) does not allow grouping by an expression that contains an aggregate function. Fixed by changing the inner `GROUP BY session_id, day` to `GROUP BY session_id`. The `day` value per session is correctly derived from `min(event_time)` after the group, and the outer query still aggregates by `day` to compute the per-day bounce rate.

## Review Notes
- **Partition granularity suboptimal but not incorrect.** `PARTITION BY toYYYYMMDD(event_time)` combined with a 2-year TTL creates up to ~730 partitions. ClickHouse documentation recommends coarser partitioning (e.g., `toYYYYMM()` monthly) for most workloads — daily partitioning adds overhead and can trip the `max_partitions_per_insert_block` limit. Left unchanged because it is syntactically valid and "correct"; consider switching to monthly partitions for production use.
- **Sessionization MV caveat.** The `AggregatingMergeTree` materialized view aggregates per INSERT batch. Consumers must use the corresponding merge functions (`minMerge`, `maxMerge`, `countMerge`, `anyMerge`) and `GROUP BY session_id, day` when reading `session_stats` to get fully merged results. This is standard ClickHouse practice but worth noting for readers unfamiliar with the state/merge pattern.
- **`uniq()` is approximate.** The daily-visitors and top-pages queries use `uniq()`, which is an HLL-based approximate count. For exact counts, `uniqExact()` should be used, though it is more memory-intensive.
- **Session spanning midnight.** With `GROUP BY session_id` in the bounce rate query, sessions that cross midnight UTC are attributed to the day of their first event (`min(event_time)`), which is the standard convention.
- All ClickHouse types, engine choices, TTL syntax, and aggregate-state function names are correct and current as of the latest ClickHouse stable releases.
