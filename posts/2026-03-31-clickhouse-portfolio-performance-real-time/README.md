# How to Track Portfolio Performance in Real-Time with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Portfolio, Finance, Real-Time, Return, Analytics

Description: Track real-time portfolio returns, benchmarking, allocation drift, and attribution analytics in ClickHouse for investment management teams.

---

Real-time portfolio performance tracking requires ingesting price ticks, computing returns on holdings, and comparing against benchmarks - all with minimal latency. ClickHouse handles this with its fast aggregation and time-series capabilities.

## Holdings and Price Tables

```sql
CREATE TABLE holdings (
    portfolio_id LowCardinality(String),
    instrument   String,
    shares       Float64,
    cost_basis   Float64,
    as_of_date   Date,
    updated_at   DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (portfolio_id, instrument, as_of_date);

CREATE TABLE prices (
    instrument   String,
    price        Float64,
    price_date   Date,
    source       LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(price_date)
ORDER BY (instrument, price_date);
```

## Current Portfolio Market Value

```sql
SELECT
    h.portfolio_id,
    h.instrument,
    h.shares,
    h.cost_basis,
    p.price AS current_price,
    h.shares * p.price AS market_value,
    h.shares * p.price - h.cost_basis AS unrealized_pnl,
    round((h.shares * p.price - h.cost_basis) / h.cost_basis * 100, 2) AS return_pct
FROM holdings FINAL h
JOIN (
    SELECT instrument, argMax(price, price_date) AS price
    FROM prices
    WHERE price_date >= today() - 1
    GROUP BY instrument
) p ON h.instrument = p.instrument
WHERE h.as_of_date = today()
ORDER BY market_value DESC;
```

## Portfolio-Level Return

Aggregate total portfolio return vs. cost basis:

```sql
SELECT
    portfolio_id,
    sum(market_value) AS total_market_value,
    sum(cost_basis) AS total_cost_basis,
    sum(market_value) - sum(cost_basis) AS total_unrealized_pnl,
    round((sum(market_value) - sum(cost_basis)) / sum(cost_basis) * 100, 2) AS portfolio_return_pct
FROM (
    SELECT
        h.portfolio_id,
        h.shares * p.price AS market_value,
        h.cost_basis
    FROM holdings FINAL h
    JOIN (
        SELECT instrument, argMax(price, price_date) AS price
        FROM prices GROUP BY instrument
    ) p ON h.instrument = p.instrument
    WHERE h.as_of_date = today()
)
GROUP BY portfolio_id;
```

## Daily Return Time Series

Track portfolio value day by day to plot the equity curve:

```sql
SELECT
    h.portfolio_id,
    p.price_date,
    sum(h.shares * p.price) AS portfolio_value
FROM holdings h
JOIN prices p ON h.instrument = p.instrument
WHERE p.price_date >= today() - 90
  AND h.as_of_date <= p.price_date
GROUP BY h.portfolio_id, p.price_date
ORDER BY h.portfolio_id, p.price_date;
```

## Asset Allocation Breakdown

Monitor allocation by asset class against targets:

```sql
SELECT
    portfolio_id,
    instrument,
    market_value,
    sum(market_value) OVER (PARTITION BY portfolio_id) AS portfolio_total,
    round(market_value / sum(market_value) OVER (PARTITION BY portfolio_id) * 100, 2) AS weight_pct
FROM (
    SELECT portfolio_id, instrument, shares * price AS market_value
    FROM holdings FINAL
    JOIN (SELECT instrument, argMax(price, price_date) AS price FROM prices GROUP BY instrument) USING instrument
    WHERE as_of_date = today()
)
ORDER BY portfolio_id, weight_pct DESC;
```

## Rolling 30-Day Volatility

Compute rolling standard deviation of daily returns:

```sql
SELECT
    portfolio_id,
    price_date,
    portfolio_value,
    daily_return,
    stddevPop(daily_return)
        OVER (PARTITION BY portfolio_id ORDER BY price_date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) AS rolling_30d_vol
FROM (
    SELECT
        portfolio_id,
        price_date,
        portfolio_value,
        portfolio_value / lag(portfolio_value) OVER (PARTITION BY portfolio_id ORDER BY price_date) - 1 AS daily_return
    FROM (
        SELECT portfolio_id, price_date, sum(shares * price) AS portfolio_value
        FROM holdings JOIN prices USING instrument
        GROUP BY portfolio_id, price_date
    )
)
ORDER BY portfolio_id, price_date;
```

## Summary

ClickHouse enables real-time portfolio analytics by joining holdings with live price data. Return calculations, equity curves, allocation weights, and rolling volatility are all achievable with standard SQL and window functions, making it a solid backend for investment performance dashboards.
