# How to Calculate Confidence Intervals in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Statistics, Confidence Interval, Analytics

Description: Learn how to calculate confidence intervals for means and proportions in ClickHouse using SQL to quantify uncertainty in your measurements.

---

## What Is a Confidence Interval?

A confidence interval (CI) gives a range of plausible values for a population parameter based on sample data. A 95% CI means that if you repeated the experiment many times, 95% of the intervals would contain the true value.

## Confidence Interval for a Mean

The formula uses the mean, standard error, and a z-score (1.96 for 95%):

```sql
SELECT
    avg(latency_ms)                                       AS mean,
    stddevSamp(latency_ms) / sqrt(count())                AS std_error,
    mean - 1.96 * std_error                               AS ci_lower,
    mean + 1.96 * std_error                               AS ci_upper
FROM request_logs
WHERE toDate(created_at) = today();
```

Note: ClickHouse allows referencing aliases defined earlier in the same SELECT, so the `mean` and `std_error` aliases can be reused in subsequent expressions without a WITH clause.

## Using a WITH Clause for Clarity

```sql
WITH
    avg(latency_ms)                        AS mean,
    stddevSamp(latency_ms) / sqrt(count()) AS se
SELECT
    mean,
    se,
    mean - 1.96 * se AS ci_lower_95,
    mean + 1.96 * se AS ci_upper_95,
    mean - 2.576 * se AS ci_lower_99,
    mean + 2.576 * se AS ci_upper_99
FROM request_logs
WHERE toDate(created_at) = today();
```

## Confidence Interval for a Proportion

For binary metrics like conversion rate:

```sql
WITH
    countIf(converted = 1) AS successes,
    count() AS n,
    successes / n AS p
SELECT
    p AS proportion,
    p - 1.96 * sqrt(p * (1 - p) / n) AS ci_lower,
    p + 1.96 * sqrt(p * (1 - p) / n) AS ci_upper
FROM funnel_events
WHERE step = 'checkout';
```

## Per-Group Confidence Intervals

Calculate CIs for each service simultaneously:

```sql
WITH
    avg(response_ms) AS mean,
    stddevSamp(response_ms) / sqrt(count()) AS se
SELECT
    service,
    mean,
    round(mean - 1.96 * se, 2) AS ci_lower,
    round(mean + 1.96 * se, 2) AS ci_upper
FROM service_metrics
WHERE toDate(ts) >= today() - 7
GROUP BY service
ORDER BY mean DESC;
```

## Using proportionsZTest for Direct CI Output

ClickHouse's `proportionsZTest` also returns confidence interval bounds directly:

```sql
SELECT
    (proportionsZTest(
        countIf(converted AND variant = 'A'),
        countIf(converted AND variant = 'B'),
        countIf(variant = 'A'),
        countIf(variant = 'B'),
        0.95, 'unpooled'
    ) AS res).3 AS ci_lower,
    res.4 AS ci_upper
FROM ab_test_events;
```

## Choosing the Right Z-Score

```text
Confidence Level | Z-Score
90%              | 1.645
95%              | 1.960
99%              | 2.576
99.9%            | 3.291
```

## Summary

Confidence intervals in ClickHouse are computed by combining `avg`, `stddevSamp`, `count`, and basic arithmetic. Use the WITH clause to keep formulas readable. For proportions, use the Wilson or Wald formula depending on your sample size, and consider `proportionsZTest` for A/B tests where you want the interval computed automatically.
