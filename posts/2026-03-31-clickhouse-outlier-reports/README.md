# How to Generate Outlier Reports in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Outlier Detection, Anomaly, Statistics, IQR

Description: Learn how to generate outlier reports in ClickHouse using IQR, Z-score, and median absolute deviation to detect anomalous data points at scale.

---

## Why Outlier Detection Matters

Outliers can indicate fraud, system errors, or genuine anomalies worth investigating. ClickHouse handles outlier detection efficiently even over billions of rows using built-in statistical aggregate functions.

## Sample Data

```sql
CREATE TABLE transactions
(
    txn_id UInt64,
    user_id UInt64,
    amount Float64,
    txn_time DateTime
)
ENGINE = MergeTree()
ORDER BY (user_id, txn_time);
```

## Z-Score Method

Flag transactions more than 3 standard deviations from the mean:

```sql
WITH stats AS (
    SELECT
        avg(amount) AS mean_amount,
        stddevPop(amount) AS std_amount
    FROM transactions
)
SELECT
    t.txn_id,
    t.user_id,
    t.amount,
    abs(t.amount - s.mean_amount) / s.std_amount AS z_score
FROM transactions t
CROSS JOIN stats s
WHERE abs(t.amount - s.mean_amount) / s.std_amount > 3
ORDER BY z_score DESC
LIMIT 100;
```

## IQR Method

The interquartile range method is more robust to extreme values:

```sql
WITH iqr_stats AS (
    SELECT
        quantile(0.25)(amount) AS q1,
        quantile(0.75)(amount) AS q3,
        quantile(0.75)(amount) - quantile(0.25)(amount) AS iqr
    FROM transactions
)
SELECT
    t.txn_id,
    t.user_id,
    t.amount,
    multiIf(t.amount < s.q1 - 1.5 * s.iqr, 'low_outlier',
             t.amount > s.q3 + 1.5 * s.iqr, 'high_outlier',
             'normal') AS classification
FROM transactions t
CROSS JOIN iqr_stats s
WHERE t.amount < s.q1 - 1.5 * s.iqr OR t.amount > s.q3 + 1.5 * s.iqr
ORDER BY t.amount DESC;
```

## Median Absolute Deviation (MAD)

MAD is the most robust statistical outlier method:

```sql
WITH median_val AS (
    SELECT median(amount) AS med FROM transactions
),
mad_val AS (
    SELECT median(abs(amount - med)) AS mad
    FROM transactions
    CROSS JOIN median_val
)
SELECT
    t.txn_id,
    t.amount,
    0.6745 * abs(t.amount - m.med) / nullIf(d.mad, 0) AS modified_z_score
FROM transactions t
CROSS JOIN median_val m
CROSS JOIN mad_val d
WHERE 0.6745 * abs(t.amount - m.med) / nullIf(d.mad, 0) > 3.5
ORDER BY modified_z_score DESC
LIMIT 100;
```

## Per-User Outlier Detection

Detect outliers relative to each user's own baseline:

```sql
WITH user_stats AS (
    SELECT
        user_id,
        avg(amount) AS mean_amount,
        stddevPop(amount) AS std_amount
    FROM transactions
    GROUP BY user_id
    HAVING count() > 5
)
SELECT
    t.txn_id,
    t.user_id,
    t.amount,
    abs(t.amount - s.mean_amount) / nullIf(s.std_amount, 0) AS user_z_score
FROM transactions t
JOIN user_stats s ON t.user_id = s.user_id
WHERE abs(t.amount - s.mean_amount) / nullIf(s.std_amount, 0) > 3
ORDER BY user_z_score DESC;
```

## Time-Based Outlier Windows

Detect spikes relative to a rolling baseline:

```sql
SELECT
    txn_time,
    amount,
    avg(amount) OVER (ORDER BY txn_time ROWS BETWEEN 99 PRECEDING AND 1 PRECEDING) AS rolling_mean,
    stddevPop(amount) OVER (ORDER BY txn_time ROWS BETWEEN 99 PRECEDING AND 1 PRECEDING) AS rolling_std,
    abs(amount - avg(amount) OVER (ORDER BY txn_time ROWS BETWEEN 99 PRECEDING AND 1 PRECEDING)) /
        nullIf(stddevPop(amount) OVER (ORDER BY txn_time ROWS BETWEEN 99 PRECEDING AND 1 PRECEDING), 0) AS rolling_z
FROM transactions
ORDER BY txn_time;
```

## Summary

ClickHouse supports Z-score, IQR, and MAD outlier detection through aggregate functions like `avg`, `stddevPop`, `quantile`, and `median`. Per-entity outlier detection via subqueries lets you find anomalies relative to individual user or service baselines.
