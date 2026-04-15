# How to Use meanZTest() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Statistics, Hypothesis Test

Description: Learn how to use meanZTest() in ClickHouse to perform a z-test for the difference in means between two groups, ideal for A/B testing at scale.

---

The `meanZTest()` aggregate function in ClickHouse implements the two-sample z-test for comparing means. When you know (or can estimate) the population variances of two groups, a z-test is more powerful than a t-test. This makes `meanZTest()` especially useful for large-scale A/B experiments where variance is stable and well-understood.

## What Is a Two-Sample Z-Test

A two-sample z-test evaluates whether the means of two independent groups differ significantly. It requires knowing the population variance for each group (or having large enough samples where the sample variance approximates the population variance). The result is a z-statistic and a p-value.

- **p-value < 0.05** - statistically significant difference at the 95% confidence level
- **p-value >= 0.05** - insufficient evidence to reject the null hypothesis

## Syntax

```sql
meanZTest(pop_var_x, pop_var_y, confidence_level)(x, y)
```

Parameters:
- `pop_var_x` - known population variance for group x (`Float64`)
- `pop_var_y` - known population variance for group y (`Float64`)
- `confidence_level` - desired confidence level, e.g. `0.95`
- `x` - numeric value column
- `y` - group indicator column (0 or 1)

Returns a tuple `(z_statistic, p_value, confidence_interval_low, confidence_interval_high)`.

## Creating Sample Data

```sql
CREATE TABLE ab_experiment
(
    user_id   UInt32,
    variant   UInt8,   -- 0 = control, 1 = treatment
    revenue   Float64
)
ENGINE = MergeTree()
ORDER BY user_id;

INSERT INTO ab_experiment VALUES
    (1,  0, 10.5), (2,  0, 12.0), (3,  0, 9.8),  (4,  0, 11.2),
    (5,  0, 10.0), (6,  0, 13.1), (7,  0, 9.5),  (8,  0, 11.7),
    (9,  1, 14.2), (10, 1, 15.0), (11, 1, 13.8), (12, 1, 16.1),
    (13, 1, 14.5), (14, 1, 15.3), (15, 1, 13.2), (16, 1, 15.8);
```

## Running the Z-Test

Test whether the treatment group has a significantly different mean revenue. Supply estimated population variances (here we use 2.0 for both groups):

```sql
SELECT meanZTest(2.0, 2.0, 0.95)(revenue, variant)
FROM ab_experiment;
```

### Unpacking the Result Tuple

```sql
SELECT
    result.1 AS z_statistic,
    result.2 AS p_value,
    result.3 AS ci_low,
    result.4 AS ci_high
FROM (
    SELECT meanZTest(2.0, 2.0, 0.95)(revenue, variant) AS result
    FROM ab_experiment
);
```

## Interpreting the Output

| Field | Meaning |
|---|---|
| `z_statistic` | Standardized difference between group means |
| `p_value` | Probability of observing this result under H0 |
| `ci_low` | Lower bound of confidence interval for mean difference |
| `ci_high` | Upper bound of confidence interval for mean difference |

A large absolute z-statistic (typically > 1.96 for 95% confidence) combined with a small p-value indicates a statistically significant difference.

## A/B Testing Example: Click-Through Rate

```sql
CREATE TABLE ctr_experiment
(
    impression_id UInt64,
    variant       UInt8,
    clicked       UInt8
)
ENGINE = MergeTree()
ORDER BY impression_id;

INSERT INTO ctr_experiment
SELECT
    number                           AS impression_id,
    number % 2                       AS variant,
    if(number % 2 = 0,
        rand() % 10 < 3,
        rand() % 10 < 4)             AS clicked
FROM numbers(10000);

-- Run the z-test with known population variance approximations
SELECT
    result.1 AS z_statistic,
    result.2 AS p_value
FROM (
    SELECT meanZTest(0.21, 0.24, 0.95)(toFloat64(clicked), variant) AS result
    FROM ctr_experiment
);
```

## Using Pre-Computed Variance

If you previously computed sample variances and want to use them as population estimates:

```sql
WITH
    (SELECT varPop(revenue) FROM ab_experiment WHERE variant = 0) AS var_control,
    (SELECT varPop(revenue) FROM ab_experiment WHERE variant = 1) AS var_treatment
SELECT
    result.1 AS z_statistic,
    result.2 AS p_value
FROM (
    SELECT meanZTest(
        var_control,
        var_treatment,
        0.95
    )(revenue, variant) AS result
    FROM ab_experiment
);
```

Note: subqueries with dynamic variance values may require a join approach in practice. The simplest workflow is to pre-compute variances and pass them as literals.

## Segmented A/B Test Analysis

Run the z-test for each country segment in a single query:

```sql
SELECT
    country,
    result.1 AS z_statistic,
    result.2 AS p_value,
    if(result.2 < 0.05, 'significant', 'not significant') AS conclusion
FROM (
    SELECT
        country,
        meanZTest(2.0, 2.0, 0.95)(revenue, variant) AS result
    FROM ab_experiment_with_country
    GROUP BY country
);
```

## Summary

`meanZTest()` in ClickHouse lets you run two-sample z-tests directly in SQL, returning the z-statistic, p-value, and confidence interval for the difference in means. It is best suited for large samples where population variances are known or can be reliably estimated. Use it in A/B testing pipelines to determine whether observed differences in metrics like revenue or CTR are statistically significant, all without exporting data to an external statistics tool.
