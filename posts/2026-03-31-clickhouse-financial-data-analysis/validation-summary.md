# Validation Summary: How to Use ClickHouse for Financial Data Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, Materialized Views)
- ClickHouse compression codecs (FPC, Delta, DoubleDelta, LZ4)
- ClickHouse window functions and aggregate functions (`argMin`, `argMax`, `exponentialMovingAverage`, `stddevPop`, `sumIf`)
- OHLCV / VWAP / SMA / EMA / volatility finance analytics patterns

## Sources Consulted
- ClickHouse column compression codecs: https://clickhouse.com/docs/sql-reference/statements/create/table
- `exponentialMovingAverage`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/exponentialmovingaverage
- Window functions: https://clickhouse.com/docs/sql-reference/window-functions
- `SimpleAggregateFunction` (supported functions): https://clickhouse.com/docs/sql-reference/data-types/simpleaggregatefunction
- AggregatingMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- `argMin` / `argMax`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmin

## Issues Found

1. **AggregatingMergeTree schema mismatch (ohlcv_1m).** The table declared `open Float64` and `close Float64` as plain columns, but the materialized view wrote `argMin(last_price, ts)` / `argMax(last_price, ts)` (finalized Float64 values). In AggregatingMergeTree, plain columns that are not part of the sorting key are merged with undefined "any" semantics across parts — so when ticks for the same minute arrive in multiple ingestion batches, merges silently discard all but one arbitrary `open`/`close`. Fixed by:
   - Declaring `open` / `close` as `AggregateFunction(argMin, Float64, DateTime64(6))` and `AggregateFunction(argMax, Float64, DateTime64(6))`.
   - Using `argMinState` / `argMaxState` in the materialized view.
   - Adding an `ohlcv_1m_final` convenience view that finalizes the states with `argMinMerge` / `argMaxMerge` in a `GROUP BY`, and retargeting the SMA / EMA / volatility queries to read from it.
   Also noted in-text that `argMin`/`argMax` are not supported by `SimpleAggregateFunction`.

2. **Invalid EMA query (nested window functions).** The original query nested `row_number() OVER (...)` inside `sum(... ) OVER (...)`. ClickHouse (and standard SQL) disallow nesting window functions; this query would fail to parse/execute.

3. **Incorrect claim that ClickHouse has no built-in EMA.** ClickHouse provides the `exponentialMovingAverage(x)(value, timeunit)` aggregate function, usable directly as a window aggregate with `OVER`. Rewrote the EMA section to use this function and removed the incorrect claim about it being missing.

## Review Notes
- FPC codec usage (`CODEC(FPC, LZ4)`) is correct — both FPC parameters (`level`, `float_size`) are optional; FPC is a data-preparation codec and composes with a general-purpose codec like LZ4. The 3-8x compression-ratio improvement versus ZSTD-alone claim is workload-dependent (very dataset- and correlation-dependent) but is within the range reported in the FPC literature and ClickHouse benchmarks; left as written.
- `CODEC(Delta(8), LZ4)` on UInt64 and `CODEC(DoubleDelta, LZ4)` on DateTime64(6) are both valid and idiomatic.
- Other queries (OHLCV aggregation on raw ticks, realized P&L via `sumIf`, VWAP, top movers join, `system.parts` storage ratio) are all syntactically and semantically correct as written.
- `TTL toDateTime(ts) + INTERVAL 5 YEAR` for a DateTime64 column is a safe, explicit cast; modern ClickHouse also accepts `ts + INTERVAL 5 YEAR` directly on DateTime64, but the explicit form is fine.
