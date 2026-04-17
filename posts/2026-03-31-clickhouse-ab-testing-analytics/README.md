# How to Build A/B Testing Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, A/B Testing, Experimentation, Analytics, Statistics

Description: Build an A/B testing analytics pipeline in ClickHouse to track experiment assignments, compute conversion rates, and assess statistical significance.

---

A/B testing is essential for data-driven product decisions. ClickHouse can store experiment assignments and conversion events at scale, then power the statistical queries that determine which variant wins.

## Experiment Assignments Table

```sql
CREATE TABLE experiment_assignments
(
    user_id UInt64,
    experiment_id LowCardinality(String),
    variant LowCardinality(String),
    assigned_at DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(assigned_at)
ORDER BY (experiment_id, variant, user_id);
```

## Experiment Events Table

```sql
CREATE TABLE experiment_events
(
    user_id UInt64,
    experiment_id LowCardinality(String),
    event_type LowCardinality(String),
    value Decimal(10, 2) DEFAULT 0,
    event_time DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (experiment_id, user_id, event_time);
```

## Conversion Rates per Variant

```sql
SELECT
    a.experiment_id,
    a.variant,
    count(DISTINCT a.user_id) AS assigned_users,
    countDistinct(e.user_id) AS converted_users,
    round(
        countDistinct(e.user_id) * 100.0 / count(DISTINCT a.user_id),
        3
    ) AS conversion_rate_pct
FROM experiment_assignments a
LEFT JOIN experiment_events e
    ON a.user_id = e.user_id
    AND a.experiment_id = e.experiment_id
    AND e.event_type = 'purchase'
WHERE a.experiment_id = 'checkout_button_color'
GROUP BY a.experiment_id, a.variant
ORDER BY a.variant;
```

## Average Revenue Per User by Variant

```sql
SELECT
    a.variant,
    count(DISTINCT a.user_id) AS users,
    sum(e.value) AS total_revenue,
    round(sum(e.value) / count(DISTINCT a.user_id), 2) AS arpu
FROM experiment_assignments a
LEFT JOIN experiment_events e
    ON a.user_id = e.user_id
    AND a.experiment_id = e.experiment_id
    AND e.event_type = 'purchase'
WHERE a.experiment_id = 'pricing_page_v2'
GROUP BY a.variant
ORDER BY arpu DESC;
```

## Cumulative Conversion Over Time

Track how conversions accumulate to detect novelty effects.

```sql
WITH daily AS (
    SELECT
        toDate(e.event_time) AS day,
        a.variant,
        countDistinct(e.user_id) AS daily_conversions
    FROM experiment_assignments a
    JOIN experiment_events e
        ON a.user_id = e.user_id
        AND a.experiment_id = e.experiment_id
        AND e.event_type = 'purchase'
    WHERE a.experiment_id = 'checkout_button_color'
    GROUP BY day, a.variant
)
SELECT
    day,
    variant,
    daily_conversions,
    sum(daily_conversions) OVER (
        PARTITION BY variant
        ORDER BY day
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_conversions
FROM daily
ORDER BY day, variant;
```

## Z-Score for Statistical Significance

Compute a two-proportion Z-score to estimate significance.

```sql
WITH stats AS (
    SELECT
        variant,
        count(DISTINCT a.user_id) AS n,
        countDistinct(e.user_id) AS x
    FROM experiment_assignments a
    LEFT JOIN experiment_events e
        ON a.user_id = e.user_id
        AND a.experiment_id = e.experiment_id
        AND e.event_type = 'purchase'
    WHERE a.experiment_id = 'checkout_button_color'
    GROUP BY variant
),
rates AS (
    SELECT variant, n, x, x * 1.0 / n AS p
    FROM stats
)
SELECT
    a.variant AS control,
    b.variant AS treatment,
    round(a.p * 100, 2) AS control_cvr,
    round(b.p * 100, 2) AS treatment_cvr,
    round(
        (b.p - a.p) / sqrt(
            ((a.p * (1 - a.p)) / a.n) + ((b.p * (1 - b.p)) / b.n)
        ),
        3
    ) AS z_score
FROM rates a
CROSS JOIN rates b
WHERE a.variant = 'control' AND b.variant = 'treatment';
```

## Summary

ClickHouse stores experiment assignments and conversion events efficiently, enabling fast queries for conversion rates, ARPU, cumulative trends, and Z-score significance tests. By combining `LEFT JOIN` with window functions and inline statistical formulas, you can analyze A/B test results without exporting data to a separate statistics tool.
