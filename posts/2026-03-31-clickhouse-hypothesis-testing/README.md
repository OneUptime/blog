# How to Perform Hypothesis Testing in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Statistics, Hypothesis Testing, Analytics, A/B Testing

Description: Learn how to perform statistical hypothesis testing in ClickHouse using built-in functions to validate data-driven decisions at scale.

---

## Why Hypothesis Testing in ClickHouse?

Hypothesis testing lets you decide whether an observed difference in data is statistically significant or just noise. Running tests directly in ClickHouse avoids exporting large datasets and keeps your analysis close to the data.

## The Z-Test for Proportions

A common scenario is comparing conversion rates between two groups. ClickHouse provides `proportionsZTest`:

```sql
SELECT proportionsZTest(
    countIf(converted = 1 AND group = 'control'),
    countIf(converted = 1 AND group = 'treatment'),
    countIf(group = 'control'),
    countIf(group = 'treatment'),
    0.95,
    'unpooled'
) AS z_test_result
FROM experiment_events
WHERE experiment_id = 'exp_42';
```

The function returns a tuple with the z-score, p-value, and confidence interval bounds.

## Interpreting the Result

```sql
WITH test AS (
    SELECT proportionsZTest(
        countIf(converted AND group = 'control'),
        countIf(converted AND group = 'treatment'),
        countIf(group = 'control'),
        countIf(group = 'treatment'),
        0.95, 'unpooled'
    ) AS result
    FROM ab_events
)
SELECT
    result.1 AS z_score,
    result.2 AS p_value,
    result.3 AS ci_lower,
    result.4 AS ci_upper,
    if(result.2 < 0.05, 'significant', 'not significant') AS verdict
FROM test;
```

A p-value below 0.05 means you can reject the null hypothesis at the 95% confidence level.

## Student's T-Test for Continuous Metrics

For comparing means - such as average order value - ClickHouse supports `studentTTest`:

```sql
SELECT studentTTest(
    revenue,
    if(group = 'control', 0, 1)
) AS ttest_result
FROM orders
WHERE experiment_id = 'exp_42';
```

The result includes the t-statistic and p-value.

## Welch's T-Test (Unequal Variances)

When group variances differ, use `welchTTest`:

```sql
SELECT welchTTest(
    session_duration_seconds,
    if(variant = 'B', 1, 0)
) AS welch_result
FROM sessions
WHERE toDate(started_at) BETWEEN '2026-01-01' AND '2026-01-31';
```

Welch's test is more robust when sample sizes or variances are unequal between groups.

## Checking Sample Sizes First

Always verify you have enough data before running the test:

```sql
SELECT
    group,
    count() AS sample_size,
    avg(metric) AS mean,
    stddevSamp(metric) AS std_dev
FROM experiment_events
GROUP BY group;
```

Small samples produce unreliable p-values regardless of the function used.

## Summary

ClickHouse supports `proportionsZTest` as a scalar function and `studentTTest` and `welchTTest` as native aggregate functions. These let you perform hypothesis testing at scale without moving data out of the database. Always check sample sizes, choose the right test for your data type, and interpret p-values alongside confidence intervals for reliable conclusions.
