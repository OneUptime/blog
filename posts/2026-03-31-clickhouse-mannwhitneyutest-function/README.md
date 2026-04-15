# How to Use mannWhitneyUTest() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Statistics, Nonparametric Test

Description: Learn how to use mannWhitneyUTest() in ClickHouse to compare two groups without assuming normality, perfect for A/B testing skewed metrics.

---

The Mann-Whitney U test (also called the Wilcoxon rank-sum test) is a nonparametric alternative to the t-test. It compares two independent groups without assuming their data follows a normal distribution, making it ideal for metrics like revenue, session duration, or page load times that are often heavily skewed. ClickHouse's `mannWhitneyUTest()` aggregate function runs this test directly in SQL.

## When to Use the Mann-Whitney U Test

Use `mannWhitneyUTest()` when:
- Your metric is not normally distributed (skewed, heavy-tailed)
- You have ordinal data
- Sample sizes are small and you cannot verify normality
- You want a rank-based comparison that is robust to outliers

## Syntax

```sql
mannWhitneyUTest(alternative, continuity_correction)(sample_data, group_indicator)
```

Parameters:
- `alternative` - hypothesis direction: `'two-sided'`, `'greater'`, or `'less'`
- `continuity_correction` - `1` to apply continuity correction, `0` to skip
- `sample_data` - numeric value column
- `group_indicator` - group label (0 = control, 1 = treatment)

Returns a tuple `(u_statistic, p_value)`.

## Creating Sample Data

```sql
CREATE TABLE ab_revenue
(
    user_id UInt32,
    variant UInt8,
    revenue Float64
)
ENGINE = MergeTree()
ORDER BY user_id;

INSERT INTO ab_revenue VALUES
    (1,  0, 5.0),  (2,  0, 6.5),  (3,  0, 4.2),  (4,  0, 100.0),
    (5,  0, 5.8),  (6,  0, 4.9),  (7,  0, 6.1),  (8,  0, 5.3),
    (9,  1, 8.0),  (10, 1, 9.5),  (11, 1, 7.8),  (12, 1, 8.3),
    (13, 1, 9.1),  (14, 1, 8.7),  (15, 1, 7.5),  (16, 1, 9.9);
```

The control group contains a large outlier (`100.0`). A standard t-test would be distorted by this; the Mann-Whitney U test is not.

## Running the Test

Two-sided test with continuity correction:

```sql
SELECT mannWhitneyUTest('two-sided', 1)(revenue, variant)
FROM ab_revenue;
```

Unpack the result tuple:

```sql
SELECT
    result.1 AS u_statistic,
    result.2 AS p_value
FROM (
    SELECT mannWhitneyUTest('two-sided', 1)(revenue, variant) AS result
    FROM ab_revenue
);
```

## Directional Tests

Test whether the control group tends to have higher values than treatment:

```sql
SELECT
    result.1 AS u_statistic,
    result.2 AS p_value
FROM (
    SELECT mannWhitneyUTest('greater', 1)(revenue, variant) AS result
    FROM ab_revenue
);
```

Use `'less'` to test whether the control group tends to have lower values than treatment.

## Interpreting the Results

| Value | Meaning |
|---|---|
| `u_statistic` | U statistic; large U means the first sample (group 0) tends to have higher ranks |
| `p_value < 0.05` | Significant difference between groups at 95% confidence |
| `p_value >= 0.05` | No statistically significant difference detected |

The Mann-Whitney U test does not compare means directly - it tests whether one distribution tends to produce higher values than the other (stochastic dominance).

## A/B Testing Page Load Times

Page load times are typically right-skewed, making this test a good fit:

```sql
CREATE TABLE page_load_test
(
    session_id UInt64,
    variant    UInt8,
    load_ms    Float64
)
ENGINE = MergeTree()
ORDER BY session_id;

INSERT INTO page_load_test
SELECT
    number                                                  AS session_id,
    number % 2                                              AS variant,
    if(number % 2 = 0,
        100 + rand() % 500,
        80  + rand() % 400)                                 AS load_ms
FROM numbers(2000);

SELECT
    result.1 AS u_statistic,
    result.2 AS p_value,
    if(result.2 < 0.05, 'significant', 'not significant')  AS conclusion
FROM (
    SELECT mannWhitneyUTest('two-sided', 1)(load_ms, variant) AS result
    FROM page_load_test
);
```

## Segmented Analysis

Run the test across multiple product categories:

```sql
SELECT
    category,
    result.1 AS u_statistic,
    result.2 AS p_value
FROM (
    SELECT
        category,
        mannWhitneyUTest('two-sided', 1)(revenue, variant) AS result
    FROM ab_revenue_with_category
    GROUP BY category
)
ORDER BY p_value;
```

## Continuity Correction

The continuity correction adjusts for the fact that a continuous test statistic is used to approximate a discrete distribution. It is recommended for small samples:

```sql
-- With continuity correction (recommended for small samples)
SELECT mannWhitneyUTest('two-sided', 1)(revenue, variant)
FROM ab_revenue;

-- Without continuity correction
SELECT mannWhitneyUTest('two-sided', 0)(revenue, variant)
FROM ab_revenue;
```

## Summary

`mannWhitneyUTest()` in ClickHouse provides a robust, rank-based hypothesis test that does not assume normality, making it ideal for real-world business metrics that are skewed or contain outliers. It accepts a direction parameter for one-sided or two-sided tests and an optional continuity correction. Use it for A/B testing revenue, load times, engagement scores, or any metric where the normality assumption is questionable.
