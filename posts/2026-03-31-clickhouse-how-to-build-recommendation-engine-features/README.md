# How to Build Recommendation Engine Features with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Recommendation Engine, Collaborative Filtering, Cosine Similarity, Analytics

Description: Learn how to store user-item interactions, compute similarity scores, and serve recommendation features at scale using ClickHouse.

---

Recommendation engines need fast lookups over massive interaction datasets. ClickHouse's columnar storage and vectorized aggregations make it an excellent backend for computing user similarity, item co-occurrence, and feature vectors that feed downstream ML models.

## Data Model

Store raw interaction events in a single wide table:

```sql
CREATE TABLE user_item_interactions
(
    user_id      UInt64,
    item_id      UInt64,
    event_type   LowCardinality(String), -- 'view', 'click', 'purchase'
    weight       Float32,
    ts           DateTime
)
ENGINE = MergeTree()
ORDER BY (user_id, item_id, ts);
```

## Computing Item Co-occurrence

Find items frequently viewed together in the same session:

```sql
SELECT
    a.item_id AS item_a,
    b.item_id AS item_b,
    count() AS co_views
FROM user_item_interactions AS a
JOIN user_item_interactions AS b
    ON a.user_id = b.user_id
    AND abs(toUnixTimestamp(a.ts) - toUnixTimestamp(b.ts)) < 1800
WHERE a.item_id < b.item_id
  AND a.event_type = 'view'
  AND b.event_type = 'view'
GROUP BY item_a, item_b
ORDER BY co_views DESC
LIMIT 100;
```

## User Feature Vectors with Materialized Views

Maintain up-to-date aggregate profiles:

```sql
CREATE MATERIALIZED VIEW user_item_weights_mv
ENGINE = AggregatingMergeTree()
ORDER BY (user_id, item_id)
AS
SELECT
    user_id,
    item_id,
    sumState(weight) AS total_weight
FROM user_item_interactions
GROUP BY user_id, item_id;
```

Query the materialized view:

```sql
SELECT user_id, item_id, sumMerge(total_weight) AS w
FROM user_item_weights_mv
WHERE user_id = 42
GROUP BY user_id, item_id
ORDER BY w DESC
LIMIT 20;
```

## Cosine Similarity Between Users

Compute cosine similarity to find users with similar taste:

```sql
WITH
    user_a AS (
        SELECT item_id, sumMerge(total_weight) AS w
        FROM user_item_weights_mv
        WHERE user_id = 1
        GROUP BY item_id
    ),
    user_b AS (
        SELECT item_id, sumMerge(total_weight) AS w
        FROM user_item_weights_mv
        WHERE user_id = 2
        GROUP BY item_id
    )
SELECT
    sum(a.w * b.w) /
        (sqrt(sum(a.w * a.w)) * sqrt(sum(b.w * b.w))) AS cosine_sim
FROM user_a AS a
FULL OUTER JOIN user_b AS b USING (item_id);
```

## Top-N Candidate Generation

Pull candidate items for a user based on weighted signals:

```sql
SELECT
    item_id,
    sumMerge(total_weight) AS score
FROM user_item_weights_mv
WHERE user_id IN (
    -- nearest neighbors from an external similarity table
    SELECT neighbor_id FROM user_neighbors WHERE user_id = 42
)
GROUP BY item_id
ORDER BY score DESC
LIMIT 50;
```

## Exporting Feature Vectors for ML

Export aggregated vectors to feed a ranking model:

```sql
SELECT
    user_id,
    groupArray(item_id) AS items,
    groupArray(w)       AS weights
FROM (
    SELECT user_id, item_id, sumMerge(total_weight) AS w
    FROM user_item_weights_mv
    GROUP BY user_id, item_id
)
GROUP BY user_id
INTO OUTFILE '/tmp/user_vectors.jsonl'
FORMAT JSONEachRow;
```

## Summary

ClickHouse handles recommendation engine features well by combining fast aggregations, materialized views for incremental updates, and flexible JOIN patterns for similarity computation. Store raw interactions, maintain weight aggregates in AggregatingMergeTree views, and export feature vectors for downstream ML ranking models. This approach scales to billions of interactions while keeping query latency in the milliseconds range.
