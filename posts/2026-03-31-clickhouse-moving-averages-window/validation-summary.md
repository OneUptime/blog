# Validation Summary: How to Compute Moving Averages with Window Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- Window Functions (AVG, ROW_NUMBER, LAG, stddevPop with OVER clause)
- ClickHouse parametric aggregate function: exponentialMovingAverage()
- Time series analysis (SMA, WMA, EMA)

## Sources Consulted
- ClickHouse official documentation — exponentialMovingAverage: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/exponentialMovingAverage
- ClickHouse official documentation — Window Functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse official documentation — stddevPop: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/stddevpop
- ClickHouse official documentation — AVG: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/avg

## Issues Found

### 1. `exponentialMovingAverage` parameter incorrectly described as "alpha"
- **What was wrong:** The post described the function signature as `exponentialMovingAverage(alpha)(value, timestamp)` and stated the parameter is "alpha (0 to 1)" that controls reactivity with "higher alpha values" being more reactive. The official ClickHouse documentation defines the parameter as `x`, the **half-life period** — the time lag at which exponential weights decay by one-half. This is not an alpha/smoothing factor.
- **What was changed:** Corrected the function signature to `exponentialMovingAverage(x)(value, timeunit)`, updated the parameter description to explain half-life semantics, and fixed the behavioral description (smaller half-life = more reactive, not larger).

### 2. `timeunit` argument used raw `toUnixTimestamp` instead of interval index
- **What was wrong:** Both EMA examples passed `toUnixTimestamp(event_time)` or `toUnixTimestamp(sale_datetime)` as the `timeunit` argument. The ClickHouse documentation explicitly states: "Timeunit is not timestamp (seconds), it's an index of the time interval. Can be calculated using `intDiv`." Using raw Unix timestamps would make the half-life parameter operate in units of seconds, producing nonsensical results for daily data.
- **What was changed:** Updated both examples to use `intDiv(toUnixTimestamp(...), 86400)` to produce a day-level interval index, matching the official documentation's recommended approach.

### 3. EMA examples used GROUP BY instead of window function
- **What was wrong:** The EMA examples used `exponentialMovingAverage` inside a `GROUP BY` query, which computes the EMA within each group independently — not across days as intended. For daily-aggregated data, each group contains one day's events, so the cross-day smoothing effect would not work as described.
- **What was changed:** Restructured the EMA examples to first aggregate data to daily granularity in a subquery, then apply `exponentialMovingAverage` as a window function with `OVER (ORDER BY ...)` to compute a proper running EMA across days. This matches the pattern shown in the official ClickHouse documentation.

## Review Notes
- The SMA window function examples (AVG with ROWS BETWEEN) are all correct and well-explained.
- The warm-up period explanation and ROW_NUMBER filtering technique are accurate.
- The PARTITION BY usage for per-group moving averages is correct.
- The weighted moving average (WMA) using LAG is a valid manual approach. Note that for the first 1-2 rows, the LAG default value (`daily_revenue`) means the WMA silently falls back to equal-weight averaging during the warm-up period — the post could mention this but it is not technically incorrect.
- The anomaly detection section using `stddevPop` as a window function is valid — ClickHouse supports all aggregate functions as window functions.
- The `exponentialMovingAverage` function's half-life parameterization differs from the traditional EMA alpha (smoothing factor) convention used in finance. Readers familiar with alpha-based EMA should note that alpha and half-life are related by: alpha = 1 - 2^(-1/x).
