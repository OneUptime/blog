# How to Build Risk Metrics Dashboards with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Risk, Dashboard, Finance, Value at Risk, Analytics

Description: Build real-time risk metrics dashboards in ClickHouse to track VaR, exposure limits, concentration risk, and counterparty risk across portfolios.

---

Risk management teams need dashboards that surface exposure, concentration, and market risk metrics in real time. ClickHouse can aggregate across large position datasets to power these dashboards with low latency.

## Positions Table

```sql
CREATE TABLE positions (
    position_id   UUID,
    portfolio_id  LowCardinality(String),
    desk          LowCardinality(String),
    asset_class   LowCardinality(String),
    instrument    String,
    counterparty  LowCardinality(String),
    notional      Float64,
    market_value  Float64,
    pnl_daily     Float64,
    delta         Float64,
    currency      LowCardinality(String),
    as_of_date    Date,
    updated_at    DateTime
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(as_of_date)
ORDER BY (portfolio_id, instrument, as_of_date);
```

## Current Exposure by Asset Class

```sql
SELECT
    asset_class,
    currency,
    sum(market_value) AS total_exposure,
    sum(notional) AS total_notional,
    count() AS position_count
FROM positions FINAL
WHERE as_of_date = today()
GROUP BY asset_class, currency
ORDER BY total_exposure DESC;
```

## Concentration Risk by Counterparty

Flag over-concentration relative to total portfolio:

```sql
SELECT *
FROM (
    SELECT
        counterparty,
        sum(market_value) AS exposure,
        sum(sum(market_value)) OVER () AS total_portfolio,
        round(sum(market_value) / sum(sum(market_value)) OVER () * 100, 2) AS concentration_pct
    FROM positions FINAL
    WHERE as_of_date = today()
    GROUP BY counterparty
)
WHERE concentration_pct > 5
ORDER BY concentration_pct DESC;
```

## Daily PnL Attribution by Desk

```sql
SELECT
    desk,
    asset_class,
    sum(pnl_daily) AS daily_pnl,
    countIf(pnl_daily > 0) AS winning_positions,
    countIf(pnl_daily < 0) AS losing_positions,
    max(pnl_daily) AS best_position,
    min(pnl_daily) AS worst_position
FROM positions FINAL
WHERE as_of_date = today()
GROUP BY desk, asset_class
ORDER BY daily_pnl DESC;
```

## Value at Risk (Historical Simulation)

Compute 1-day 99% VaR from daily PnL history:

```sql
SELECT
    portfolio_id,
    quantile(0.01)(daily_pnl_sum) AS var_99_1day
FROM (
    SELECT
        portfolio_id,
        as_of_date,
        sum(pnl_daily) AS daily_pnl_sum
    FROM positions
    WHERE as_of_date >= today() - 252
    GROUP BY portfolio_id, as_of_date
)
GROUP BY portfolio_id
ORDER BY var_99_1day;
```

## Limit Breach Monitoring

Alert when positions exceed pre-defined notional limits:

```sql
SELECT
    portfolio_id,
    desk,
    sum(abs(notional)) AS gross_notional,
    500000000 AS notional_limit,  -- example limit
    sum(abs(notional)) > 500000000 AS is_breached
FROM positions FINAL
WHERE as_of_date = today()
GROUP BY portfolio_id, desk
HAVING is_breached = 1
ORDER BY gross_notional DESC;
```

## Materialized View for Intraday Refresh

```sql
CREATE MATERIALIZED VIEW risk_summary_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(as_of_date)
ORDER BY (portfolio_id, desk, as_of_date)
AS SELECT
    portfolio_id,
    desk,
    as_of_date,
    sumState(market_value) AS total_exposure_state,
    sumState(pnl_daily) AS total_pnl_state
FROM positions
GROUP BY portfolio_id, desk, as_of_date;
```

## Summary

ClickHouse powers real-time risk dashboards by aggregating position data across portfolios in milliseconds. Queries for exposure concentration, VaR, daily PnL attribution, and limit breach monitoring are all expressible in standard SQL. ReplacingMergeTree handles position updates efficiently, while materialized views keep intraday summaries fresh.
