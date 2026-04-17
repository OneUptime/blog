# How to Use ClickHouse for Financial Data Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Finance, Analytics, TimeSeries, Trading, Aggregation

Description: Learn how to use ClickHouse for financial data analysis including tick data storage, OHLCV aggregation, moving averages, P&L calculation, and risk metrics queries.

---

Financial data analysis demands sub-second query response over billions of tick records, complex time-based aggregations (OHLCV, rolling windows), and accurate decimal arithmetic. ClickHouse meets all three requirements with columnar storage, FPC and Gorilla codecs for float compression, and rich window function support.

## Schema: Tick Data

```sql
CREATE TABLE market_ticks
(
    symbol_id   UInt32                 CODEC(LZ4),
    exchange    LowCardinality(String) CODEC(LZ4),
    bid         Float64                CODEC(FPC, LZ4),
    ask         Float64                CODEC(FPC, LZ4),
    last_price  Float64                CODEC(FPC, LZ4),
    volume      UInt64                 CODEC(Delta(8), LZ4),
    ts          DateTime64(6)          CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (symbol_id, ts)
TTL toDateTime(ts) + INTERVAL 5 YEAR
SETTINGS index_granularity = 8192;
```

FPC codec on Float64 price columns achieves 3-8x better compression than ZSTD alone on correlated price series. DateTime64(6) provides microsecond precision for HFT data.

## Symbol Reference Table

```sql
CREATE TABLE symbols
(
    symbol_id   UInt32,
    ticker      String,
    name        String,
    sector      LowCardinality(String),
    currency    FixedString(3)
)
ENGINE = MergeTree()
ORDER BY symbol_id;
```

## OHLCV Aggregation (1-Minute Candles)

```sql
SELECT
    symbol_id,
    toStartOfMinute(ts)           AS minute,
    argMin(last_price, ts)        AS open,
    max(last_price)               AS high,
    min(last_price)               AS low,
    argMax(last_price, ts)        AS close,
    sum(volume)                   AS volume
FROM market_ticks
WHERE symbol_id = 1001
  AND ts >= toDateTime('2024-01-15 09:30:00')
  AND ts <  toDateTime('2024-01-15 16:00:00')
GROUP BY symbol_id, minute
ORDER BY minute;
```

## Materialized OHLCV Table

Pre-aggregate 1-minute candles on ingestion to avoid recomputing them on every query. `argMin`/`argMax` are not supported by `SimpleAggregateFunction`, so `open` and `close` must be stored as full `AggregateFunction` states and written with the `-State` combinators:

```sql
CREATE TABLE ohlcv_1m
(
    symbol_id UInt32,
    minute    DateTime,
    open      AggregateFunction(argMin, Float64, DateTime64(6)),
    high      SimpleAggregateFunction(max, Float64),
    low       SimpleAggregateFunction(min, Float64),
    close     AggregateFunction(argMax, Float64, DateTime64(6)),
    volume    SimpleAggregateFunction(sum, UInt64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(minute)
ORDER BY (symbol_id, minute);

CREATE MATERIALIZED VIEW ohlcv_1m_mv
TO ohlcv_1m
AS
SELECT
    symbol_id,
    toStartOfMinute(ts)          AS minute,
    argMinState(last_price, ts)  AS open,
    max(last_price)              AS high,
    min(last_price)              AS low,
    argMaxState(last_price, ts)  AS close,
    sum(volume)                  AS volume
FROM market_ticks
GROUP BY symbol_id, minute;
```

Queries against `ohlcv_1m` must finalize the aggregate states with `argMinMerge`/`argMaxMerge` inside a `GROUP BY`. A convenience view makes downstream queries read like a plain table:

```sql
CREATE VIEW ohlcv_1m_final AS
SELECT
    symbol_id,
    minute,
    argMinMerge(open)  AS open,
    max(high)          AS high,
    min(low)           AS low,
    argMaxMerge(close) AS close,
    sum(volume)        AS volume
FROM ohlcv_1m
GROUP BY symbol_id, minute;
```

## 20-Period Simple Moving Average

```sql
SELECT
    symbol_id,
    minute,
    close,
    avg(close) OVER (
        PARTITION BY symbol_id
        ORDER BY minute
        ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) AS sma_20
FROM ohlcv_1m_final
WHERE symbol_id = 1001
  AND minute >= now() - INTERVAL 1 DAY
ORDER BY minute;
```

## Exponential Moving Average (EMA)

ClickHouse has a built-in `exponentialMovingAverage(x)(value, timeunit)` aggregate function, where `x` is the half-life (in `timeunit` steps) and `timeunit` is an integer time index. It can be called as a window function with `OVER`:

```sql
SELECT
    symbol_id,
    minute,
    close,
    exponentialMovingAverage(10)(close, toUInt32(minute)) OVER (
        PARTITION BY symbol_id
        ORDER BY minute
        ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) AS ema_20
FROM ohlcv_1m_final
WHERE symbol_id = 1001
ORDER BY minute
LIMIT 100;
```

## Portfolio P&L Calculation

```sql
CREATE TABLE trades
(
    trade_id    UInt64,
    user_id     UInt64                 CODEC(LZ4),
    symbol_id   UInt32                 CODEC(LZ4),
    side        LowCardinality(String) CODEC(LZ4), -- 'buy' or 'sell'
    quantity    Float64                CODEC(FPC),
    price       Float64                CODEC(FPC),
    executed_at DateTime64(6)          CODEC(DoubleDelta, LZ4)
)
ENGINE = MergeTree()
ORDER BY (user_id, symbol_id, executed_at);
```

Calculate realized P&L per user per symbol:

```sql
SELECT
    user_id,
    symbol_id,
    sumIf(quantity * price, side = 'sell') - sumIf(quantity * price, side = 'buy') AS realized_pnl
FROM trades
WHERE user_id = 42
GROUP BY user_id, symbol_id
ORDER BY realized_pnl DESC;
```

## Volume Weighted Average Price (VWAP)

```sql
SELECT
    symbol_id,
    toDate(ts)                            AS day,
    sum(last_price * volume) / sum(volume) AS vwap
FROM market_ticks
WHERE ts >= now() - INTERVAL 30 DAY
GROUP BY symbol_id, day
ORDER BY symbol_id, day;
```

## Volatility (Rolling Standard Deviation)

```sql
SELECT
    symbol_id,
    minute,
    close,
    stddevPop(close) OVER (
        PARTITION BY symbol_id
        ORDER BY minute
        ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
    ) AS volatility_20
FROM ohlcv_1m_final
WHERE symbol_id = 1001
ORDER BY minute
LIMIT 500;
```

## Top Movers Over the Last Day

```sql
SELECT
    t.symbol_id,
    s.ticker,
    argMin(t.last_price, t.ts) AS open_price,
    argMax(t.last_price, t.ts) AS close_price,
    round(100.0 * (close_price - open_price) / open_price, 2) AS pct_change
FROM market_ticks t
JOIN symbols s ON t.symbol_id = s.symbol_id
WHERE t.ts >= toStartOfDay(now())
GROUP BY t.symbol_id, s.ticker
ORDER BY abs(pct_change) DESC
LIMIT 20;
```

## Storage Efficiency Check

```sql
SELECT
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio,
    count() AS parts
FROM system.parts
WHERE active = 1
  AND table = 'market_ticks'
  AND database = currentDatabase();
```

## Summary

ClickHouse is well-suited for financial data analysis: FPC codec compresses correlated price series 3-8x better than generic compression, DoubleDelta compresses microsecond timestamps efficiently, and materialized views pre-compute OHLCV candles at ingest time. Window functions handle moving averages, volatility, and VWAP. A single ClickHouse node can query years of tick data across thousands of symbols in under a second, making it viable for both real-time dashboards and historical research queries.
