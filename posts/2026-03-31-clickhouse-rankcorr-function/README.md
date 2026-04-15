# How to Use rankCorr() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Rank Correlation, Spearman, Statistics

Description: Learn how to use rankCorr() in ClickHouse to calculate Spearman rank correlation and detect monotonic relationships between variables.

---

ClickHouse's `rankCorr()` aggregate function computes the Spearman rank correlation coefficient between two columns. Unlike Pearson correlation (`corr()`), which measures linear relationships, Spearman rank correlation measures monotonic relationships - whether one variable consistently increases as the other increases, regardless of whether the relationship is linear. This makes `rankCorr()` robust to outliers and non-linear associations.

## Pearson vs. Spearman Correlation

| Aspect | `corr()` (Pearson) | `rankCorr()` (Spearman) |
|---|---|---|
| Measures | Linear relationship | Monotonic relationship |
| Sensitive to outliers | Yes | No |
| Assumes normality | Yes | No |
| Range | -1 to 1 | -1 to 1 |

Use `rankCorr()` when data is skewed, contains outliers, or the relationship is expected to be monotonic but not strictly linear.

## Syntax

```sql
rankCorr(x, y)
```

Returns a `Float64` in the range [-1, 1]:
- **1.0** - perfect positive monotonic relationship
- **0.0** - no monotonic relationship
- **-1.0** - perfect negative monotonic relationship

## Creating Sample Data

```sql
CREATE TABLE product_metrics
(
    product_id  UInt32,
    price       Float64,
    sales_rank  UInt32,
    review_score Float64
)
ENGINE = MergeTree()
ORDER BY product_id;

INSERT INTO product_metrics VALUES
    (1,  9.99,  1,  4.8),
    (2, 19.99,  3,  4.5),
    (3, 29.99,  6,  4.2),
    (4, 49.99,  8,  3.9),
    (5, 99.99, 15,  3.5),
    (6, 14.99,  2,  4.7),
    (7, 24.99,  5,  4.3),
    (8, 39.99,  9,  4.0),
    (9, 79.99, 12,  3.7),
    (10, 5.99,  4,  4.6);
```

## Basic Usage

```sql
SELECT rankCorr(price, sales_rank)
FROM product_metrics;
```

## Comparing rankCorr() and corr()

Observe how the two functions differ on skewed or non-linear data:

```sql
SELECT
    rankCorr(price, sales_rank)  AS spearman_corr,
    corr(price, sales_rank)      AS pearson_corr
FROM product_metrics;
```

When an outlier exists, Pearson correlation can be heavily distorted while Spearman remains stable.

## Detecting Monotonic Relationships

```sql
SELECT
    rankCorr(price, review_score)   AS price_vs_review,
    rankCorr(price, sales_rank)     AS price_vs_rank,
    rankCorr(review_score, sales_rank) AS review_vs_rank
FROM product_metrics;
```

## Effect of Outliers

```sql
-- Insert a large outlier
INSERT INTO product_metrics VALUES (11, 999.99, 100, 1.0);

SELECT
    rankCorr(price, sales_rank) AS spearman_corr,
    corr(price, sales_rank)     AS pearson_corr
FROM product_metrics;
-- Pearson shifts significantly; Spearman remains stable
```

## Time Series Monotonicity

Check whether a metric trends consistently over time:

```sql
CREATE TABLE daily_metrics
(
    day     Date,
    day_num UInt32,
    revenue Float64
)
ENGINE = MergeTree()
ORDER BY day;

INSERT INTO daily_metrics VALUES
    ('2024-01-01', 1,  100.0),
    ('2024-01-02', 2,  105.0),
    ('2024-01-03', 3,   98.0),
    ('2024-01-04', 4,  112.0),
    ('2024-01-05', 5,  120.0),
    ('2024-01-06', 6,  118.0),
    ('2024-01-07', 7,  130.0);

SELECT rankCorr(day_num, revenue) AS trend_monotonicity
FROM daily_metrics;
-- Values close to 1 indicate a consistent upward trend
```

## Per-Category Correlation Analysis

```sql
SELECT
    category,
    rankCorr(price, sales_rank)         AS price_rank_corr,
    rankCorr(review_score, sales_rank)  AS review_rank_corr,
    count()                             AS product_count
FROM product_metrics_with_category
GROUP BY category
ORDER BY price_rank_corr DESC;
```

## Interpreting Rank Correlation Values

| Range | Interpretation |
|---|---|
| 0.9 to 1.0 | Very strong positive monotonic relationship |
| 0.7 to 0.9 | Strong positive monotonic relationship |
| 0.5 to 0.7 | Moderate positive monotonic relationship |
| 0.3 to 0.5 | Weak positive monotonic relationship |
| -0.3 to 0.3 | Little or no monotonic relationship |
| -0.5 to -0.3 | Weak negative monotonic relationship |
| -0.7 to -0.5 | Moderate negative monotonic relationship |
| -0.9 to -0.7 | Strong negative monotonic relationship |
| -1.0 to -0.9 | Very strong negative monotonic relationship |

## Summary

`rankCorr()` computes the Spearman rank correlation coefficient in ClickHouse, measuring the strength of monotonic relationships between two columns. It is more robust than Pearson correlation (`corr()`) when data is non-normal, skewed, or contains outliers. Use it for product analytics, trend analysis, and feature correlation studies where the assumption of linearity cannot be made.
