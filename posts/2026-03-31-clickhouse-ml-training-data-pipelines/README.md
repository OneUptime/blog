# How to Build ML Training Data Pipelines with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Machine Learning, Data Pipeline, Feature Engineering, Training Data, ETL

Description: Learn how to use ClickHouse as the backbone of ML training data pipelines for feature engineering, dataset generation, and data export.

---

ClickHouse excels at processing the large volumes of raw event data that ML models need for training. Its columnar storage, vectorized execution, and rich function library make it ideal for feature engineering and generating training datasets at scale.

## Structuring Raw Data for ML

Organize raw events in a ClickHouse table optimized for ML feature extraction:

```sql
CREATE TABLE user_events
(
    event_id    UInt64,
    user_id     UInt64,
    session_id  String,
    event_type  LowCardinality(String),
    item_id     UInt64,
    timestamp   DateTime,
    properties  Map(String, String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, timestamp);
```

## Feature Engineering in SQL

Generate per-user features for a recommendation model:

```sql
SELECT
    user_id,
    count() AS total_events,
    countIf(event_type = 'purchase') AS purchases,
    countIf(event_type = 'view') AS views,
    countIf(event_type = 'purchase') / greatest(countIf(event_type = 'view'), 1) AS conversion_rate,
    uniq(session_id) AS sessions,
    uniq(item_id) AS unique_items_interacted,
    max(timestamp) AS last_activity,
    dateDiff('day', min(timestamp), max(timestamp)) AS active_days,
    dateDiff('second', min(timestamp), max(timestamp)) / greatest(count() - 1, 1) AS avg_event_gap_sec
FROM user_events
WHERE timestamp BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY user_id
ORDER BY user_id;
```

## Building a Point-in-Time Correct Dataset

For time-series ML models, compute features only from data available before the label date:

```sql
WITH label_dates AS (
    SELECT user_id, min(timestamp) AS first_purchase
    FROM user_events
    WHERE event_type = 'purchase'
    GROUP BY user_id
)
SELECT
    l.user_id,
    l.first_purchase,
    countIf(e.event_type = 'view' AND e.timestamp < l.first_purchase) AS pre_purchase_views,
    dateDiff('day', min(e.timestamp), l.first_purchase) AS days_to_convert
FROM label_dates l
JOIN user_events e ON e.user_id = l.user_id
GROUP BY l.user_id, l.first_purchase;
```

## Exporting Training Data to CSV

```sql
SELECT
    user_id,
    total_events,
    purchases,
    conversion_rate,
    sessions
FROM (
    SELECT
        user_id,
        count() AS total_events,
        countIf(event_type = 'purchase') AS purchases,
        countIf(event_type = 'purchase') / greatest(countIf(event_type = 'view'), 1) AS conversion_rate,
        uniq(session_id) AS sessions
    FROM user_events
    GROUP BY user_id
)
INTO OUTFILE '/var/lib/clickhouse/exports/training_features.csv'
FORMAT CSV;
```

## Materialized Views for Pre-Computed Features

Build features incrementally as new events arrive:

```sql
CREATE MATERIALIZED VIEW user_feature_summary
ENGINE = AggregatingMergeTree()
PARTITION BY tuple()
ORDER BY user_id
AS
SELECT
    user_id,
    countState() AS event_count_state,
    uniqState(session_id) AS session_count_state,
    sumStateIf(1, event_type = 'purchase') AS purchase_count_state
FROM user_events
GROUP BY user_id;
```

Merge states when reading:

```sql
SELECT
    user_id,
    countMerge(event_count_state) AS events,
    uniqMerge(session_count_state) AS sessions,
    sumMerge(purchase_count_state) AS purchases
FROM user_feature_summary
GROUP BY user_id;
```

## Stratified Sampling for Balanced Datasets

```sql
-- Deterministic 10% random sample
SELECT * FROM user_features
WHERE (cityHash64(user_id) % 100) < 10
ORDER BY rand()
LIMIT 100000;
```

## Summary

ClickHouse is a powerful engine for ML training data pipelines. Use SQL for feature engineering, point-in-time correct dataset construction, and materialized views for incremental feature updates. Export to CSV or Parquet for downstream model training in Python or Spark.
