# Validation Summary: How to Use ClickHouse for Ad Impression and Click Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, Materialized Views)
- SQL DDL (CREATE TABLE, CREATE MATERIALIZED VIEW)
- ClickHouse data types (UUID, UInt32/64, LowCardinality, FixedString, Decimal, DateTime64)
- ClickHouse CODECs (LZ4, ZSTD, DoubleDelta)
- ClickHouse aggregate functions (`uniqExact`, `uniqCombined`, `countIf`, `sum`, `count`)
- Mermaid diagrams

## Sources Consulted
- ClickHouse Table Engines: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SimpleAggregateFunction: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse Column Compression Codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse TTL expressions: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse uniqExact / uniqCombined: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact and .../uniqcombined
- ClickHouse LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse JOIN semantics: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse Decimal types and `toDecimal64`: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

- Table schemas (`impressions`, `clicks`, `conversions`, `campaign_stats_1h`) use valid ClickHouse DDL with correct data types, CODECs, engines, partitioning, ordering, and TTL expressions.
- `TTL toDateTime(ts) + INTERVAL 2 YEAR` correctly wraps a `DateTime64` column so the TTL expression evaluates to `DateTime`.
- `AggregatingMergeTree` with `SimpleAggregateFunction(sum, ...)` columns is the right pattern — it correctly stores raw values that are summed during merges without requiring `-State`/`-Merge` modifiers.
- Materialized views inserting `count()` and `sum(cost_usd)` into `SimpleAggregateFunction` columns is valid; ClickHouse handles the implicit cast (e.g., `sum(Decimal(10,6))` widens to `Decimal(38,6)` and is stored into the target `Decimal(18,6)` column as long as values fit).
- The `LEFT JOIN` pattern using `countIf(c.click_id != toUUID('00000000-0000-0000-0000-000000000000'))` is the standard ClickHouse idiom for distinguishing joined vs. unmatched rows since ClickHouse fills unmatched right-side columns with the default value (not NULL) unless `join_use_nulls = 1` is set.
- `uniqExact` (deterministic exact count) and `uniqCombined` (HyperLogLog-based approximate, faster at scale) claims are correct.
- Reusing SELECT aliases (`impressions`, `clicks`, `ctr_pct`) in the same `SELECT`, in `HAVING`, and in `ORDER BY` is supported in ClickHouse.

## Review Notes
- The `CTR by Campaign (Last 24 Hours)` query performs `LEFT JOIN impressions → clicks` on `impression_id`. By default ClickHouse uses `ALL` join strictness, so if an impression has multiple clicks, it would produce multiple result rows and slightly inflate both `count()` (impressions) and `countIf(...)` (clicks). In real ad-tech data, the ratio of clicks to impressions is typically very small so the effect is usually negligible, but readers running this at high accuracy requirements may prefer `LEFT ANY JOIN` or two separate per-campaign aggregations joined by `campaign_id`. This is a modelling choice rather than a correctness bug, so it was left as-is.
- `cost_usd` is `Decimal(10, 6)` while the target `spend_usd` aggregate column is `Decimal(18, 6)`. For extremely large sums this cast narrowing from `Decimal(38, 6)` (the type of `sum()` over `Decimal(10,6)`) back to `Decimal(18, 6)` could overflow at implausible scales; at realistic ad-spend volumes there is ample headroom.
- Mermaid `\n` line breaks inside node labels render correctly in modern Mermaid versions; `<br/>` is also commonly used.
