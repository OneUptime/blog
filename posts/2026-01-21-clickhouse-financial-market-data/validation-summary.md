# Validation Summary: How to Use ClickHouse for Financial Market Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- MergeTree, AggregatingMergeTree, and ReplacingMergeTree table engines
- ClickHouse materialized views
- ClickHouse aggregate function states and combinators
- ClickHouse window functions
- Financial market data analytics, including tick data, OHLCV, VWAP, TWAP, technical indicators, and risk metrics

## Sources Consulted
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse incremental materialized view documentation: https://clickhouse.com/docs/materialized-view/incremental-materialized-view
- ClickHouse cascading materialized views documentation: https://clickhouse.com/docs/guides/developer/cascading-materialized-views
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse window functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse lagInFrame documentation: https://clickhouse.com/docs/sql-reference/window-functions/lagInFrame
- ClickHouse leadInFrame documentation: https://clickhouse.com/docs/sql-reference/window-functions/leadInFrame
- ClickHouse DateTime64 documentation: https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse MergeTree documentation, including TTL support: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found
- The OHLCV pre-computation used `SummingMergeTree` for open, high, low, close, and VWAP columns. ClickHouse sums non-key numeric columns in `SummingMergeTree`, so repeated partial rows for the same bar could corrupt price fields. Replaced this with `AggregatingMergeTree` state tables, aggregate-state materialized views, and queryable views that finalize the states.
- The 1-hour OHLCV rollup summed or arbitrarily merged values that require aggregation semantics such as first open, max high, min low, last close, and weighted VWAP. Updated it to merge the 1-minute aggregate states into an hourly aggregate-state table and expose a finalized `ohlcv_1h` view.
- Several examples used `lagInFrame` and `leadInFrame` where standard lag/lead semantics were intended. ClickHouse documents that `lagInFrame` and `leadInFrame` respect the current window frame, so these were replaced with `lag` and `lead`, with explicit defaults where needed.
- The price movement alert used `HAVING` to filter a window-function alias without aggregation. Rewrote it as a CTE and filtered the computed percentage change in an outer `WHERE` clause.
- The intraday volume pattern labeled `count()` as `avg_trades` even though it returned total trades for the grouped time-of-day bucket across all days. Changed it to divide by `uniqExact(trade_date)`.
- The risk metrics query labeled `min(daily_return)` as max drawdown, but that expression returns the worst daily return, not maximum drawdown. Updated the comment to match the calculation.

## Review Notes
- The SQL was validated by static review against official ClickHouse documentation. The local workspace does not include a `clickhouse` binary, so the snippets were not executed locally.
- The EMA example uses a recursive CTE. Current ClickHouse documentation lists recursive queries as supported, but this approach may be expensive on large OHLCV histories compared with precomputed indicator tables or application-side indicator calculation.
