# How to Analyze Trading Bot Performance with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Trading, Bot, Analytics, Finance, Window Function

Description: Track and analyze trading bot performance metrics including PnL, win rates, drawdowns, and execution quality using ClickHouse.

---

Algorithmic trading bots execute thousands of orders per day. ClickHouse provides the analytical power to evaluate bot performance across dimensions like profitability, execution quality, and risk exposure.

## Trade Schema

```sql
CREATE TABLE bot_trades (
    trade_id     UUID,
    bot_id       LowCardinality(String),
    strategy     LowCardinality(String),
    symbol       LowCardinality(String),
    side         LowCardinality(String),  -- buy, sell
    quantity     Float64,
    entry_price  Float64,
    exit_price   Nullable(Float64),
    pnl          Nullable(Float64),
    fees         Float64,
    entry_at     DateTime64(3),
    exit_at      Nullable(DateTime64(3)),
    status       LowCardinality(String)   -- open, closed, cancelled
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(entry_at)
ORDER BY (bot_id, strategy, entry_at);
```

## Win Rate and Average PnL Per Strategy

```sql
SELECT
    bot_id,
    strategy,
    count() AS total_trades,
    countIf(pnl > 0) AS winning_trades,
    countIf(pnl < 0) AS losing_trades,
    round(countIf(pnl > 0) / count() * 100, 2) AS win_rate_pct,
    round(avg(pnl), 4) AS avg_pnl,
    round(sum(pnl), 2) AS total_pnl,
    round(sum(fees), 2) AS total_fees,
    round(sum(pnl) - sum(fees), 2) AS net_pnl
FROM bot_trades
WHERE status = 'closed'
  AND entry_at >= today() - 30
GROUP BY bot_id, strategy
ORDER BY net_pnl DESC;
```

## Profit Factor

Profit factor is the ratio of gross profit to gross loss - a key risk metric:

```sql
SELECT
    bot_id,
    strategy,
    sumIf(pnl, pnl > 0) AS gross_profit,
    abs(sumIf(pnl, pnl < 0)) AS gross_loss,
    round(sumIf(pnl, pnl > 0) / nullIf(abs(sumIf(pnl, pnl < 0)), 0), 3) AS profit_factor
FROM bot_trades
WHERE status = 'closed'
  AND entry_at >= today() - 90
GROUP BY bot_id, strategy
ORDER BY profit_factor DESC;
```

## Cumulative PnL and Drawdown

Track equity curve and maximum drawdown over time:

```sql
SELECT
    bot_id,
    strategy,
    entry_at,
    pnl,
    cumulative_pnl,
    max(cumulative_pnl) OVER (PARTITION BY bot_id, strategy ORDER BY entry_at) AS running_peak,
    cumulative_pnl -
        max(cumulative_pnl) OVER (PARTITION BY bot_id, strategy ORDER BY entry_at) AS drawdown
FROM (
    SELECT
        bot_id,
        strategy,
        entry_at,
        pnl,
        sum(pnl) OVER (PARTITION BY bot_id, strategy ORDER BY entry_at) AS cumulative_pnl
    FROM bot_trades
    WHERE status = 'closed'
      AND entry_at >= today() - 30
)
ORDER BY bot_id, strategy, entry_at;
```

## Execution Quality - Slippage Analysis

Measure slippage between expected and actual fill prices:

```sql
SELECT
    bot_id,
    symbol,
    side,
    avg(abs(entry_price - exit_price) / entry_price * 100) AS avg_slippage_pct,
    quantile(0.95)(abs(entry_price - exit_price) / entry_price * 100) AS p95_slippage_pct
FROM bot_trades
WHERE status = 'closed'
  AND entry_at >= today() - 7
GROUP BY bot_id, symbol, side
ORDER BY avg_slippage_pct DESC;
```

## Hourly Activity Pattern

Identify which trading hours produce the best returns:

```sql
SELECT
    toHour(entry_at) AS hour_utc,
    count() AS trades,
    round(avg(pnl), 4) AS avg_pnl,
    round(sum(pnl), 2) AS total_pnl
FROM bot_trades
WHERE status = 'closed'
  AND entry_at >= today() - 30
GROUP BY hour_utc
ORDER BY hour_utc;
```

## Summary

ClickHouse is well-suited for trading bot analytics - fast aggregations over millions of trades deliver win rates, profit factors, drawdown curves, and slippage metrics in real time. Window functions enable equity curve calculations, while partitioning by month keeps historical queries efficient.
