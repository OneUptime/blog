# How to Use welchTTest() and studentTTest() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Statistics, T-Test

Description: Learn how to use welchTTest() and studentTTest() in ClickHouse to compare group means and interpret p-values for A/B testing and experiments.

---

ClickHouse provides two parametric t-test functions for comparing the means of two independent groups: `studentTTest()` assumes equal variances between groups (the classic Student's t-test), while `welchTTest()` does not make this assumption and is generally safer when group variances differ. Both functions return a t-statistic, p-value, and confidence interval, making them straightforward to use in SQL-based experiment analysis.

## Choosing Between the Two Functions

| Function | Variance Assumption | When to Use |
|---|---|---|
| `studentTTest()` | Equal variances | Groups have similar spread; classic t-test |
| `welchTTest()` | Unequal variances | Default choice; more robust in practice |

When in doubt, prefer `welchTTest()`. The Welch correction adjusts the degrees of freedom based on the observed variances, so it is valid even when group variances happen to be equal.

## Syntax

```sql
-- Welch t-test (unequal variances)
welchTTest(confidence_level)(sample_data, group_indicator)

-- Student t-test (equal variances)
studentTTest(confidence_level)(sample_data, group_indicator)
```

Parameters:
- `confidence_level` - desired confidence level, e.g. `0.95`
- `sample_data` - numeric column of measurements
- `group_indicator` - group label (0 = control, 1 = treatment)

Both functions return a tuple `(t_statistic, p_value, confidence_interval_low, confidence_interval_high)`.

## Creating Sample Data

```sql
CREATE TABLE experiment
(
    user_id UInt32,
    variant UInt8,
    revenue Float64
)
ENGINE = MergeTree()
ORDER BY user_id;

INSERT INTO experiment VALUES
    (1,  0, 10.5), (2,  0, 11.0), (3,  0, 9.8),  (4,  0, 10.2),
    (5,  0, 10.8), (6,  0, 11.5), (7,  0, 9.6),  (8,  0, 10.4),
    (9,  1, 13.2), (10, 1, 14.0), (11, 1, 12.9), (12, 1, 13.7),
    (13, 1, 14.3), (14, 1, 13.5), (15, 1, 12.8), (16, 1, 14.1);
```

## Running welchTTest

```sql
SELECT welchTTest(0.95)(revenue, variant)
FROM experiment;
```

Unpack the tuple for readable output:

```sql
SELECT
    result.1 AS t_statistic,
    result.2 AS p_value,
    result.3 AS ci_low,
    result.4 AS ci_high
FROM (
    SELECT welchTTest(0.95)(revenue, variant) AS result
    FROM experiment
);
```

## Running studentTTest

```sql
SELECT
    result.1 AS t_statistic,
    result.2 AS p_value,
    result.3 AS ci_low,
    result.4 AS ci_high
FROM (
    SELECT studentTTest(0.95)(revenue, variant) AS result
    FROM experiment
);
```

## Interpreting the Results

| Field | Meaning |
|---|---|
| `t_statistic` | Magnitude and direction of the difference relative to variability |
| `p_value < 0.05` | Significant difference at 95% confidence |
| `ci_low`, `ci_high` | 95% confidence interval for the mean difference |

A negative t-statistic means group 0 has a lower mean than group 1. A positive value means group 0 is higher.

## Checking Whether Variances Are Equal

Use `varSamp()` to inspect group variances before choosing a test:

```sql
SELECT
    variant,
    avg(revenue)    AS mean_revenue,
    varSamp(revenue) AS var_revenue,
    count()         AS n
FROM experiment
GROUP BY variant;
```

If the ratio of the larger variance to the smaller variance exceeds 2-4, prefer `welchTTest()`.

## Side-by-Side Comparison

Compare both tests on the same data to see how much the results diverge:

```sql
SELECT
    'welch'   AS test,
    result.1  AS t_statistic,
    result.2  AS p_value
FROM (SELECT welchTTest(0.95)(revenue, variant) AS result FROM experiment)

UNION ALL

SELECT
    'student' AS test,
    result.1  AS t_statistic,
    result.2  AS p_value
FROM (SELECT studentTTest(0.95)(revenue, variant) AS result FROM experiment);
```

## Multi-Metric A/B Test

Test multiple metrics in a single query using conditional aggregation:

```sql
SELECT
    'revenue'   AS metric,
    result.1    AS t_statistic,
    result.2    AS p_value
FROM (SELECT welchTTest(0.95)(revenue, variant) AS result FROM experiment)

UNION ALL

SELECT
    'sessions'  AS metric,
    result.1    AS t_statistic,
    result.2    AS p_value
FROM (SELECT welchTTest(0.95)(session_count, variant) AS result FROM experiment_sessions);
```

## Confidence Level Adjustment

For experiments testing multiple hypotheses, use a stricter confidence level (Bonferroni correction):

```sql
-- Testing 5 metrics: use 0.99 instead of 0.95 (0.05 / 5 = 0.01 per test)
SELECT
    result.1 AS t_statistic,
    result.2 AS p_value,
    result.3 AS ci_low,
    result.4 AS ci_high
FROM (
    SELECT welchTTest(0.99)(revenue, variant) AS result
    FROM experiment
);
```

## Summary

`welchTTest()` and `studentTTest()` bring standard parametric t-tests into ClickHouse SQL. Use `welchTTest()` as the safe default for A/B experiments since it handles unequal variances; switch to `studentTTest()` only when you have strong evidence that both groups share the same variance. Both functions return a t-statistic, p-value, and confidence interval tuple that can be unpacked inline for clean, readable query output.
