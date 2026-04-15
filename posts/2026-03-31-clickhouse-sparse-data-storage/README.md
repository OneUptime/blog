# How to Store and Query Sparse Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Sparse Data, Map, Nullable

Description: Learn how to store sparse data in ClickHouse using Map types, Nullable columns, default values, and compression strategies for efficiency.

---

Sparse data - where most rows have empty or absent values for a given attribute - is a common challenge in analytics workloads. Event tables with dozens of optional fields, multi-tenant systems with per-tenant metadata, and entity tables with rare properties all produce sparse column patterns. ClickHouse offers several approaches: `Nullable` columns, `Map` types for dynamic keys, default values, and column-level compression tuning. Choosing the right strategy has a direct impact on storage size and query speed.

## The Problem with Many Nullable Columns

Adding a large number of optional columns to a table creates a sparse schema where most values are NULL:

```sql
CREATE TABLE user_events_sparse (
    user_id       UInt64,
    event_type    String,
    ts            DateTime,

    -- These are filled only for specific event types
    page_url      Nullable(String),
    product_id    Nullable(UInt64),
    search_query  Nullable(String),
    error_code    Nullable(UInt16),
    referrer      Nullable(String),
    campaign      Nullable(String),
    coupon_code   Nullable(String)
) ENGINE = MergeTree()
ORDER BY (user_id, ts);
```

Each `Nullable` column adds a null-bitmap byte per row and stores a value of the inner type even when NULL (or relies on compression to eliminate it). Queries scanning irrelevant nullable columns still read their null bitmaps.

## Using Map for Dynamic Sparse Properties

The `Map(K, V)` type stores key-value pairs per row, which is natural for sparse, per-row attributes where the set of keys is unpredictable:

```sql
CREATE TABLE user_events (
    event_id   UInt64,
    user_id    UInt64,
    event_type LowCardinality(String),
    ts         DateTime,
    props      Map(String, String)   -- sparse per-event properties
) ENGINE = MergeTree()
ORDER BY (user_id, ts);

INSERT INTO user_events (event_id, user_id, event_type, ts, props) VALUES
(1, 1, 'page_view',  now(), {'url': '/home', 'referrer': 'google.com'}),
(2, 2, 'purchase',   now(), {'product_id': '42', 'amount': '29.99', 'coupon': 'SAVE10'}),
(3, 3, 'search',     now(), {'query': 'clickhouse docs', 'results': '12'}),
(4, 4, 'page_view',  now(), {'url': '/pricing'});

-- Access a specific key
SELECT user_id, props['url'] AS page_url
FROM user_events
WHERE event_type = 'page_view';

-- Check if a key exists
SELECT user_id, props
FROM user_events
WHERE mapContains(props, 'coupon');

-- Extract all keys
SELECT user_id, mapKeys(props) AS property_names
FROM user_events;
```

The tradeoff: `Map` columns cannot be indexed directly, so filtering by map values requires a full column scan.

## Using Map with Typed Values

When all values share a type, use a typed Map for efficiency:

```sql
CREATE TABLE metric_samples (
    service   LowCardinality(String),
    ts        DateTime,
    metrics   Map(LowCardinality(String), Float64)
) ENGINE = MergeTree()
ORDER BY (service, ts);

INSERT INTO metric_samples VALUES
('api',      now(), {'latency_ms': 42.3, 'error_rate': 0.01}),
('database', now(), {'latency_ms': 5.1,  'connections': 128.0, 'cache_hit': 0.92}),
('api',      now(), {'latency_ms': 38.7, 'throughput': 1200.0});

SELECT
    service,
    avg(metrics['latency_ms'])  AS avg_latency
FROM metric_samples
WHERE mapContains(metrics, 'latency_ms')
GROUP BY service;
```

## Using Default Values to Avoid Nullable

For columns that are rarely set but have a sensible zero-value, use a non-nullable column with a default instead of `Nullable`. This avoids the null-bitmap overhead:

```sql
CREATE TABLE purchases (
    order_id      UInt64,
    user_id       UInt64,
    total         Float64,

    -- Default to empty string / 0 instead of Nullable
    coupon_code   String   DEFAULT '',
    discount_pct  Float32  DEFAULT 0.0,
    referral_id   UInt64   DEFAULT 0
) ENGINE = MergeTree()
ORDER BY (user_id, order_id);

-- Query using the sentinel default to find rows without coupons
SELECT count()
FROM purchases
WHERE coupon_code = '';
```

This pattern works well when the default zero-value is distinguishable from real data (e.g., `referral_id = 0` means no referral).

## Compression Strategies for Sparse Columns

ClickHouse's ZSTD and LZ4 compression algorithms handle runs of identical values (like 0 or NULL) very efficiently. You can tune per-column compression codecs to maximize this:

```sql
CREATE TABLE sparse_optimized (
    id         UInt64          CODEC(Delta, ZSTD),
    ts         DateTime        CODEC(Delta, ZSTD),
    value      Float64         CODEC(Gorilla, ZSTD),
    rare_field Nullable(UInt32) CODEC(ZSTD(9)),  -- high compression for sparse nulls
    props      Map(String, String) CODEC(ZSTD(3))
) ENGINE = MergeTree()
ORDER BY (id, ts);
```

For sparse `Nullable` columns where most values are NULL, `ZSTD(9)` or `ZSTD(19)` provides excellent compression of the null bitmaps and zero-value runs.

## Querying Null Counts to Identify Sparsity

Before designing your schema, measure actual sparsity in existing data:

```sql
SELECT
    countIf(coupon_code = '')     AS empty_coupon,
    countIf(coupon_code != '')    AS set_coupon,
    count()                       AS total,
    round(countIf(coupon_code = '') / count() * 100, 1) AS pct_empty
FROM purchases;
```

If a column is more than 90% NULL or zero, it is a strong candidate for a `Map` or a separate child table with a foreign key.

## Using a Separate Sparse Attribute Table

For extremely sparse properties that are also queryable, a separate attributes table can be more efficient than adding nullable columns:

```sql
CREATE TABLE event_attributes (
    event_id   UInt64,
    key        LowCardinality(String),
    value      String
) ENGINE = MergeTree()
ORDER BY (event_id, key);

INSERT INTO event_attributes VALUES
(1, 'referrer', 'google.com'),
(2, 'coupon',   'SAVE10'),
(2, 'amount',   '29.99');

-- Join with the main event table
SELECT e.user_id, a.value AS coupon
FROM user_events AS e
JOIN event_attributes AS a ON e.event_id = a.event_id
WHERE a.key = 'coupon';
```

## Summary

ClickHouse offers three main strategies for sparse data: `Nullable` columns with high-compression codecs for known-schema sparse fields, `Map` types for dynamic or unpredictable keys, and default sentinel values when nullability is not required. For columns that are more than 90% empty, consider moving them to a separate attributes table or consolidating them into a `Map` column. Always measure actual column sparsity before choosing a storage strategy.
