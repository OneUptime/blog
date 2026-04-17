# Validation Summary: How to Build Order Book Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, window functions, materialized views, ASOF JOIN)
- Financial market data concepts (quotes, trades, order book levels, OHLCV, VWAP, bid-ask spread, slippage)
- Kafka (mentioned in architecture diagram for ingestion)
- Mermaid (for architecture diagrams)

## Sources Consulted
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse MergeTree Engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Date/Time Functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse ASOF JOIN: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse GitHub Issue #72227 (RANGE frame type constraints): https://github.com/ClickHouse/ClickHouse/issues/72227
- ClickHouse Data Types (Decimal, LowCardinality, DateTime64): https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found

1. **Rolling VWAP window function used incorrect RANGE offset unit with DateTime64(9)**
   - **Original:** `ORDER BY traded_at RANGE BETWEEN 3600 PRECEDING AND CURRENT ROW` on a `DateTime64(9)` column.
   - **Problem:** For `DateTime64(9)` (nanosecond precision), the RANGE offset is interpreted in the same precision units (nanoseconds), so `3600 PRECEDING` would be 3600 nanoseconds (~3.6 microseconds), not 1 hour. Additionally, ClickHouse does not support INTERVAL syntax in DateTime RANGE frames, and RANGE offsets are constrained to 32-bit integers, which wouldn't fit 3600 seconds expressed in nanoseconds.
   - **Fix:** Changed `ORDER BY traded_at` to `ORDER BY toUnixTimestamp(traded_at)` in both window specifications of the rolling VWAP query. `toUnixTimestamp` returns seconds (UInt32), so `RANGE BETWEEN 3600 PRECEDING` now correctly represents a 1-hour window.

## Review Notes

- **Materialized view aggregation pattern:** The `ohlcv_1m_mv` materialized view aggregates into a plain `MergeTree` target table. In ClickHouse, materialized view `SELECT`s run per INSERT block, so aggregates like `sum`, `argMin`, `argMax`, `count` produce per-block partial results. If multiple INSERT blocks contain trades for the same `(instrument, candle_time)`, the target table will hold multiple partial rows per candle that require re-aggregation at query time. For production use, `AggregatingMergeTree` with `-State` / `-Merge` aggregate function combinators (or `SummingMergeTree` for purely additive fields) is the idiomatic pattern. The current code is valid SQL but is a potential gotcha for readers; not changed because it's a design-level consideration rather than a syntax error.
- **ASOF JOIN in slippage query:** The `ASOF JOIN` syntax with `t.traded_at >= q.quoted_at` correctly matches each trade with the most recent quote at or before the trade time. Valid ClickHouse pattern.
- **Schema design:** Partitioning by `toYYYYMMDD(...)` is daily partitioning, which may produce many parts for high-throughput tick tables over long retention windows. Monthly partitioning (`toYYYYMM`) is often preferred for tick data; however, this is a trade-off depending on retention and query patterns, not an error.
- **TTL syntax:** `TTL toDate(snapshotted_at) + INTERVAL 30 DAY DELETE` is valid; the explicit `DELETE` action is optional (default) but fine to specify.
- **Decimal(18, 8) precision:** Adequate for crypto/most spot markets but may be insufficient for some high-precision instruments. Acceptable for the tutorial's scope.
- **`quantile(0.95)(abs(slippage_bps))`:** Parametric aggregate function syntax is correct.
