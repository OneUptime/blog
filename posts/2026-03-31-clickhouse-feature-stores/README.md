# How to Use ClickHouse for Feature Stores

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Feature Store, Machine Learning, ReplacingMergeTree, Analytics, ML Pipeline

Description: Build a low-latency feature store on ClickHouse to serve pre-computed ML features for training and online inference at scale.

---

A feature store centralizes computed ML features so they can be reused across training pipelines and inference services. ClickHouse is a strong backend for feature stores because it offers fast point lookups, efficient batch reads, and historical feature queries - all in the same system.

## Schema Design

Features are versioned rows keyed by entity (user, product, session) and timestamp:

```sql
CREATE TABLE feature_store
(
    entity_type  LowCardinality(String),
    entity_id    UInt64,
    feature_name LowCardinality(String),
    feature_val  Float64,
    computed_at  DateTime
)
ENGINE = ReplacingMergeTree(computed_at)
ORDER BY (entity_type, entity_id, feature_name)
PARTITION BY toYYYYMM(computed_at);
```

## Writing Features

```sql
INSERT INTO feature_store VALUES
('user', 1001, 'purchase_count_30d', 12.0, now()),
('user', 1001, 'avg_order_value',    49.5, now()),
('user', 1002, 'purchase_count_30d', 3.0,  now());
```

## Reading the Latest Feature Vector for a User

```sql
SELECT
    feature_name,
    argMax(feature_val, computed_at) AS val
FROM feature_store
WHERE entity_type = 'user' AND entity_id = 1001
GROUP BY feature_name;
```

`argMax` retrieves the most recent value per feature without needing FINAL.

## Pivoting Features into a Row for Model Serving

```sql
SELECT
    entity_id,
    argMaxIf(feature_val, computed_at, feature_name = 'purchase_count_30d') AS purchase_count,
    argMaxIf(feature_val, computed_at, feature_name = 'avg_order_value')    AS avg_order_value
FROM feature_store
WHERE entity_type = 'user'
  AND entity_id IN (1001, 1002)
  AND computed_at >= now() - INTERVAL 1 DAY
GROUP BY entity_id;
```

## Point-in-Time Feature Retrieval for Training

Training data must use feature values as they existed at the label timestamp, not current values:

```sql
SELECT
    t.user_id,
    t.label,
    argMaxIf(f.feature_val, f.computed_at, f.feature_name = 'purchase_count_30d'
             AND f.computed_at <= t.event_time) AS purchase_count
FROM training_labels AS t
LEFT JOIN feature_store AS f ON f.entity_id = t.user_id
WHERE f.entity_type = 'user'
GROUP BY t.user_id, t.label;
```

## Batch Export for Offline Training

```sql
SELECT entity_id, feature_name, feature_val
FROM feature_store FINAL
WHERE entity_type = 'user'
  AND computed_at >= today() - 30
INTO OUTFILE '/tmp/features.parquet' FORMAT Parquet;
```

## Summary

ClickHouse feature stores use ReplacingMergeTree to maintain the latest feature value per entity, `argMax` for efficient latest-value reads, and JOIN with label tables for point-in-time historical retrieval. Batch exports via `INTO OUTFILE` feed offline training jobs, while direct SQL queries serve online inference pipelines with sub-millisecond point lookups.
