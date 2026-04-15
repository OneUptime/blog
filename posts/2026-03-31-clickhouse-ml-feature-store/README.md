# How to Build a Machine Learning Feature Store with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Machine Learning, Feature Store, MLOps, Analytics

Description: Use ClickHouse as the offline and online serving layer of a machine learning feature store, covering feature ingestion, point-in-time joins, and low-latency retrieval.

## Introduction

A feature store separates feature computation from model training and serving. It provides a consistent, reusable set of features that data scientists can use to train models and production systems can use at inference time.

ClickHouse is a compelling choice for the offline layer of a feature store because it can serve historical feature values for training dataset creation at scale and execute point-in-time correct joins efficiently. Its columnar storage and fast aggregations make it possible to compute feature statistics, monitor feature drift, and run batch feature backfills quickly.

This guide walks through the core tables, ingestion patterns, and query patterns you need to use ClickHouse as a feature store.

## Core Concepts

A feature store has two serving paths:
- **Offline store** - historical feature values for training, evaluated at arbitrary past timestamps
- **Online store** - latest feature values for inference, returned in milliseconds

ClickHouse covers the offline store very well. It can also serve as an online store for non-latency-critical use cases (under 50ms) by querying with indexed lookups.

## Schema Design

### Feature Registry

```sql
CREATE TABLE feature_definitions
(
    feature_id      UUID DEFAULT generateUUIDv4(),
    feature_name    String,
    feature_group   LowCardinality(String),
    entity_type     LowCardinality(String),  -- user, item, session, order
    value_type      LowCardinality(String),  -- float, int, string, array
    description     String,
    owner           LowCardinality(String),
    created_at      DateTime DEFAULT now(),
    is_active       UInt8 DEFAULT 1,
    tags            Array(String)
)
ENGINE = MergeTree()
ORDER BY (feature_group, feature_name);
```

### Feature Values (Offline Store)

```sql
CREATE TABLE feature_values
(
    entity_type     LowCardinality(String),
    entity_id       String,
    feature_name    LowCardinality(String),
    feature_group   LowCardinality(String),
    value_float     Nullable(Float64),
    value_int       Nullable(Int64),
    value_string    Nullable(String),
    event_time      DateTime64(3),
    created_at      DateTime64(3) DEFAULT now64()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (entity_type, feature_group, entity_id, feature_name, event_time);
```

### Feature Snapshots (Online Store)

```sql
CREATE TABLE feature_snapshots
(
    entity_type     LowCardinality(String),
    entity_id       String,
    feature_name    LowCardinality(String),
    feature_group   LowCardinality(String),
    value_float     Nullable(Float64),
    value_int       Nullable(Int64),
    value_string    Nullable(String),
    updated_at      DateTime64(3)
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (entity_type, feature_group, entity_id, feature_name);
```

`ReplacingMergeTree` with `updated_at` as the version column ensures that repeated upserts keep only the latest value for each entity-feature combination. Query it with `FINAL` to get deduplicated results.

### Training Dataset Requests

```sql
CREATE TABLE training_dataset_requests
(
    request_id      UUID DEFAULT generateUUIDv4(),
    requested_by    String,
    requested_at    DateTime DEFAULT now(),
    feature_names   Array(String),
    entity_type     LowCardinality(String),
    label_column    String,
    start_time      DateTime,
    end_time        DateTime,
    status          LowCardinality(String),
    row_count       UInt64 DEFAULT 0,
    s3_path         String
)
ENGINE = MergeTree()
ORDER BY requested_at;
```

## Ingesting Feature Values

Feature pipelines compute values and insert them in batches:

```sql
INSERT INTO feature_values
    (entity_type, entity_id, feature_name, feature_group, value_float, event_time)
VALUES
    ('user', 'u-1001', 'purchase_count_7d',    'user_activity', 12.0,  now64()),
    ('user', 'u-1001', 'avg_order_value_30d',  'user_activity', 87.50, now64()),
    ('user', 'u-1001', 'days_since_last_login', 'user_activity', 3.0,  now64()),
    ('item', 'i-5001', 'view_count_7d',         'item_stats',    450.0, now64()),
    ('item', 'i-5001', 'conversion_rate_30d',   'item_stats',    0.043, now64());
```

## Point-in-Time Correct Feature Retrieval

Training data must use only feature values that were available at the time of the label event. This prevents data leakage. The following query performs a point-in-time join between a label table and the feature store:

```sql
-- Assume label_events has columns: entity_id, label_time, label_value
WITH labels AS (
    SELECT entity_id, label_time, label_value
    FROM label_events
    WHERE label_time BETWEEN '2025-01-01' AND '2025-12-31'
),
pit_features AS (
    SELECT
        fv.entity_id,
        fv.feature_name,
        fv.value_float,
        fv.event_time,
        l.label_time,
        l.label_value,
        row_number() OVER (
            PARTITION BY fv.entity_id, fv.feature_name, l.label_time
            ORDER BY fv.event_time DESC
        ) AS rn
    FROM feature_values AS fv
    JOIN labels AS l ON fv.entity_id = l.entity_id
    WHERE fv.entity_type = 'user'
      AND fv.event_time <= l.label_time
)
SELECT
    entity_id,
    label_time,
    label_value,
    feature_name,
    value_float
FROM pit_features
WHERE rn = 1;
```

## Latest Feature Values for Online Serving

```sql
SELECT
    entity_id,
    feature_name,
    value_float,
    value_string,
    updated_at
FROM feature_snapshots FINAL
WHERE entity_type = 'user'
  AND entity_id = 'u-1001'
  AND feature_group = 'user_activity';
```

## Feature Statistics for Monitoring

Compute mean, standard deviation, and quantiles for each feature to detect drift:

```sql
SELECT
    feature_name,
    toDate(event_time)              AS day,
    count()                         AS row_count,
    avg(value_float)                AS mean,
    stddevPop(value_float)          AS std_dev,
    min(value_float)                AS min_val,
    max(value_float)                AS max_val,
    quantile(0.25)(value_float)     AS p25,
    quantile(0.5)(value_float)      AS p50,
    quantile(0.75)(value_float)     AS p75,
    quantile(0.99)(value_float)     AS p99,
    countIf(value_float IS NULL) / count() AS null_rate
FROM feature_values
WHERE entity_type = 'user'
  AND feature_group = 'user_activity'
  AND event_time >= now() - INTERVAL 30 DAY
GROUP BY feature_name, day
ORDER BY feature_name, day;
```

## Feature Drift Detection

Compare the current week's distribution against a baseline week:

```sql
WITH baseline AS (
    SELECT
        feature_name,
        avg(value_float) AS mean,
        stddevPop(value_float) AS std
    FROM feature_values
    WHERE event_time BETWEEN now() - INTERVAL 14 DAY AND now() - INTERVAL 7 DAY
      AND entity_type = 'user'
    GROUP BY feature_name
),
current_week AS (
    SELECT
        feature_name,
        avg(value_float) AS mean,
        stddevPop(value_float) AS std
    FROM feature_values
    WHERE event_time >= now() - INTERVAL 7 DAY
      AND entity_type = 'user'
    GROUP BY feature_name
)
SELECT
    c.feature_name,
    b.mean AS baseline_mean,
    c.mean AS current_mean,
    abs(c.mean - b.mean) / nullIf(b.std, 0) AS z_score_drift
FROM current_week AS c
JOIN baseline AS b ON c.feature_name = b.feature_name
ORDER BY z_score_drift DESC;
```

A z-score above 3 signals significant feature drift and may warrant retraining.

## Batch Feature Retrieval for Training

Generate a wide training table by pivoting feature values:

```sql
SELECT
    entity_id,
    maxIf(value_float, feature_name = 'purchase_count_7d')     AS purchase_count_7d,
    maxIf(value_float, feature_name = 'avg_order_value_30d')    AS avg_order_value_30d,
    maxIf(value_float, feature_name = 'days_since_last_login')  AS days_since_last_login,
    maxIf(value_float, feature_name = 'session_count_7d')       AS session_count_7d,
    toDate(max(event_time))                                      AS as_of_date
FROM feature_values
WHERE entity_type = 'user'
  AND feature_group = 'user_activity'
  AND event_time BETWEEN '2025-06-01' AND '2025-06-30'
GROUP BY entity_id;
```

## Feature Coverage Analysis

Which entities are missing which features?

```sql
WITH entity_feature_matrix AS (
    SELECT
        entity_id,
        groupUniqArray(feature_name) AS present_features
    FROM feature_values
    WHERE entity_type = 'user'
      AND event_time >= now() - INTERVAL 7 DAY
    GROUP BY entity_id
)
SELECT
    entity_id,
    present_features,
    length(present_features) AS feature_count
FROM entity_feature_matrix
WHERE NOT has(present_features, 'purchase_count_7d')
   OR NOT has(present_features, 'avg_order_value_30d')
ORDER BY feature_count
LIMIT 50;
```

## TTL for Historical Feature Values

Old feature values can be moved to cold storage after a year and deleted after three years:

```sql
ALTER TABLE feature_values
    MODIFY TTL
        event_time + INTERVAL 1 YEAR  TO DISK 'cold_storage',
        event_time + INTERVAL 3 YEAR  DELETE;
```

## Conclusion

ClickHouse makes a capable offline feature store for machine learning pipelines. Its columnar layout is efficient for the wide, pivoted queries used in training dataset creation. Point-in-time correct joins prevent data leakage without requiring specialized infrastructure. Feature drift monitoring using built-in statistical functions keeps model quality in check over time. For online serving, `ReplacingMergeTree` with `FINAL` gives you consistent latest-value lookups.

**Related Reading:**

- [What Is CollapsingMergeTree and When to Use It](https://oneuptime.com/blog/post/2026-03-31-clickhouse-collapsingmergetree-guide/view)
- [What Is the Difference Between ReplicatedMergeTree and MergeTree](https://oneuptime.com/blog/post/2026-03-31-clickhouse-replicated-vs-mergetree/view)
- [What Is FINAL Keyword and When to Use It in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-final-keyword-guide/view)
