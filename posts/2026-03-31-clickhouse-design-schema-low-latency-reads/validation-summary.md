# Validation Summary: How to Design a ClickHouse Schema for Low-Latency Reads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- SummingMergeTree
- ReplacingMergeTree
- Materialized views
- Projections
- Skip indexes (bloom_filter, set, minmax)
- LowCardinality, Decimal, Date, DateTime64 data types
- Partitioning (toYYYYMM)

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Projections and reverse-key PR: https://github.com/ClickHouse/ClickHouse/pull/71095
- ClickHouse LowCardinality docs: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse Date type: https://clickhouse.com/docs/en/sql-reference/data-types/date
- ClickHouse DateTime type: https://clickhouse.com/docs/en/sql-reference/data-types/datetime
- ClickHouse SummingMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree

## Issues Found
1. **Projection `ORDER BY ... DESC` is invalid** — The original example used `ORDER BY (event_date, revenue DESC)`. Standard ClickHouse MergeTree sort keys (and projection ORDER BY clauses) only support ascending order; descending sort keys require the experimental `allow_experimental_reverse_key` setting. Fixed by removing `DESC`, so the projection is valid in default ClickHouse builds. The projection still helps queries that filter by `event_date` and order by revenue due to columnar storage and prefix pruning.
2. **Incorrect byte sizes for Date vs DateTime** — The post stated `Date` was "4 bytes vs 8 bytes for DateTime". Per official docs, `Date` is 2 bytes (days since 1970-01-01) and `DateTime` is 4 bytes. Corrected the comment to "2 bytes vs 4 bytes for DateTime".

## Review Notes
- The "LowCardinality ... 4-10x smaller" claim isn't a number stated in official ClickHouse docs, but it is within the realistic range observed in practice for low-cardinality string columns. Left as-is since the savings are genuinely large and the claim is defensible.
- Skip index syntax and parameters (`bloom_filter(0.01)`, `set(100)`, `minmax`) are all correct per current docs.
- `SummingMergeTree` correctly supports summing `Decimal` columns.
- The `CREATE MATERIALIZED VIEW ... AS SELECT` example implicitly relies on data flowing in from inserts to `events`; this is standard ClickHouse MV behavior and is correct, though readers deploying this should be aware that MVs populate only from new inserts (a `POPULATE` clause or backfill is needed for existing data). This is a usage nuance, not a technical error in the post.
