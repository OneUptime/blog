# How to Model Nested and Array Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Arrays, Nested Data, JSON, Schema Design, Database, Analytics, Data Modeling

Description: A practical guide to working with complex data types in ClickHouse, including arrays, nested structures, tuples, maps, and JSON columns for flexible schema designs.

---

Real-world data is rarely flat. Events have multiple tags, users have lists of purchases, and logs contain nested JSON payloads. ClickHouse handles these complex structures efficiently through arrays, nested types, tuples, maps, and JSON columns. This guide shows you how to model and query them.

## Arrays: The Foundation

Arrays store ordered collections of same-typed values. They're the building block for most complex data patterns in ClickHouse.

### Creating Array Columns

Define array columns with the Array() type:

```sql
CREATE TABLE user_events
(
    user_id UInt64,
    event_time DateTime,
    tags Array(String),
    scores Array(Float64),
    related_ids Array(UInt64)
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);
```

### Inserting Array Data

Insert arrays using square bracket notation:

```sql
INSERT INTO user_events VALUES
    (1, now(), ['signup', 'premium', 'mobile'], [0.8, 0.9, 0.7], [100, 200]),
    (2, now(), ['signup', 'desktop'], [0.5, 0.6], [100]),
    (3, now(), [], [], []);  -- Empty arrays are valid
```

### Essential Array Functions

ClickHouse provides dozens of array functions. Here are the most useful:

```sql
-- Check if array contains a value
SELECT * FROM user_events WHERE has(tags, 'premium');

-- Get array length
SELECT user_id, length(tags) AS tag_count FROM user_events;

-- Access element by index (1-based)
SELECT tags[1] AS first_tag FROM user_events;

-- Concatenate arrays
SELECT arrayConcat(tags, ['new_tag']) FROM user_events;

-- Filter array elements
SELECT arrayFilter(x -> x > 0.7, scores) AS high_scores FROM user_events;

-- Transform array elements
SELECT arrayMap(x -> upper(x), tags) AS upper_tags FROM user_events;

-- Flatten nested arrays
SELECT arrayFlatten([[1, 2], [3, 4]]);  -- Returns [1, 2, 3, 4]

-- Get unique values
SELECT arrayDistinct(tags) FROM user_events;

-- Sort arrays
SELECT arraySort(scores) FROM user_events;

-- Find index of element
SELECT indexOf(tags, 'premium') FROM user_events;
```

### Array Aggregation

Aggregate values into arrays or aggregate array contents:

```sql
-- Collect values into an array
SELECT
    user_id,
    groupArray(event_time) AS all_event_times
FROM user_events
GROUP BY user_id;

-- Sum all elements across rows
SELECT
    user_id,
    arraySum(scores) AS total_score
FROM user_events;

-- Count occurrences across arrays
SELECT
    tag,
    count() AS usage_count
FROM user_events
ARRAY JOIN tags AS tag
GROUP BY tag
ORDER BY usage_count DESC;
```

## ARRAY JOIN: Expanding Arrays

ARRAY JOIN is powerful for working with array data. It expands arrays into rows.

### Basic ARRAY JOIN

```sql
-- Each tag becomes its own row
SELECT
    user_id,
    tag
FROM user_events
ARRAY JOIN tags AS tag;

-- Result:
-- user_id | tag
-- 1       | signup
-- 1       | premium
-- 1       | mobile
-- 2       | signup
-- 2       | desktop
```

### Multiple Array Joins

Join multiple arrays in parallel:

```sql
-- Join tags and scores together (by position)
SELECT
    user_id,
    tag,
    score
FROM user_events
ARRAY JOIN
    tags AS tag,
    scores AS score;
```

### LEFT ARRAY JOIN

Keep rows even with empty arrays:

```sql
-- Normal ARRAY JOIN skips rows with empty arrays
-- LEFT ARRAY JOIN includes them with NULL
SELECT
    user_id,
    tag
FROM user_events
LEFT ARRAY JOIN tags AS tag;
```

## Nested Data Type

The Nested type creates parallel arrays that stay synchronized. It's syntactic sugar for multiple related arrays.

### Creating Nested Columns

```sql
CREATE TABLE orders
(
    order_id UInt64,
    customer_id UInt64,
    order_date Date,

    -- Nested structure for line items
    items Nested
    (
        product_id UInt64,
        quantity UInt32,
        unit_price Decimal64(2)
    )
)
ENGINE = MergeTree()
ORDER BY (customer_id, order_date);
```

Behind the scenes, ClickHouse creates three arrays: `items.product_id`, `items.quantity`, and `items.unit_price`.

### Inserting Nested Data

```sql
INSERT INTO orders VALUES
(
    1001,
    42,
    '2024-01-15',
    [101, 102, 103],      -- items.product_id
    [2, 1, 3],             -- items.quantity
    [19.99, 49.99, 9.99]   -- items.unit_price
);

-- Alternative syntax with tuples
INSERT INTO orders VALUES
(
    1002,
    42,
    '2024-01-16',
    [201],
    [5],
    [29.99]
);
```

### Querying Nested Data

```sql
-- Access nested columns
SELECT
    order_id,
    items.product_id,
    items.quantity
FROM orders;

-- Use ARRAY JOIN to expand nested structure
SELECT
    order_id,
    product_id,
    quantity,
    unit_price,
    quantity * unit_price AS line_total
FROM orders
ARRAY JOIN
    items.product_id AS product_id,
    items.quantity AS quantity,
    items.unit_price AS unit_price;

-- Filter and aggregate nested data
SELECT
    order_id,
    arraySum(arrayMap((q, p) -> q * p, items.quantity, items.unit_price)) AS order_total
FROM orders;
```

## Tuples: Fixed-Size Structures

Tuples hold a fixed number of elements with potentially different types.

### Creating Tuple Columns

```sql
CREATE TABLE events
(
    event_id UUID,
    event_time DateTime,

    -- Named tuple for location
    location Tuple(
        latitude Float64,
        longitude Float64,
        accuracy Float32
    ),

    -- Unnamed tuple
    dimensions Tuple(UInt32, UInt32, UInt32)
)
ENGINE = MergeTree()
ORDER BY event_time;
```

### Working with Tuples

```sql
-- Insert tuple data
INSERT INTO events VALUES
(
    generateUUIDv4(),
    now(),
    (37.7749, -122.4194, 10.5),
    (100, 200, 50)
);

-- Access tuple elements by name
SELECT
    location.latitude,
    location.longitude
FROM events;

-- Access by position (1-indexed)
SELECT
    dimensions.1 AS width,
    dimensions.2 AS height,
    dimensions.3 AS depth
FROM events;

-- Create tuples dynamically
SELECT tuple(1, 'hello', 3.14) AS my_tuple;
```

## Maps: Flexible Key-Value Storage

Maps store dynamic key-value pairs, perfect for tags, attributes, and metadata.

### Creating Map Columns

```sql
CREATE TABLE metrics
(
    timestamp DateTime,
    metric_name String,
    value Float64,

    -- String keys and values
    labels Map(String, String),

    -- String keys with numeric values
    counters Map(String, UInt64)
)
ENGINE = MergeTree()
ORDER BY (metric_name, timestamp);
```

### Working with Maps

```sql
-- Insert map data
INSERT INTO metrics VALUES
(
    now(),
    'http_requests',
    1523,
    {'environment': 'production', 'region': 'us-east-1', 'service': 'api'},
    {'2xx': 1400, '4xx': 100, '5xx': 23}
);

-- Access map values by key
SELECT
    labels['environment'] AS env,
    labels['region'] AS region,
    counters['5xx'] AS error_count
FROM metrics;

-- Check if key exists
SELECT * FROM metrics WHERE mapContains(labels, 'service');

-- Get all keys or values
SELECT
    mapKeys(labels) AS label_keys,
    mapValues(labels) AS label_values
FROM metrics;

-- Filter by map contents
SELECT * FROM metrics
WHERE labels['environment'] = 'production';

-- Iterate over map entries
SELECT
    metric_name,
    key,
    value
FROM metrics
ARRAY JOIN mapKeys(counters) AS key, mapValues(counters) AS value;
```

### Map Aggregation

```sql
-- Merge maps from multiple rows
SELECT
    metric_name,
    sumMap(counters) AS total_counters
FROM metrics
GROUP BY metric_name;

-- This sums values for matching keys across rows
```

## JSON: Semi-Structured Data

For truly flexible schemas, ClickHouse offers JSON support.

### JSON Column Type

```sql
CREATE TABLE api_logs
(
    timestamp DateTime,
    endpoint String,

    -- JSON column for variable payload
    request_body JSON,
    response_body JSON
)
ENGINE = MergeTree()
ORDER BY timestamp;
```

### Inserting JSON Data

```sql
INSERT INTO api_logs VALUES
(
    now(),
    '/api/users',
    '{"user_id": 123, "action": "update", "fields": {"name": "Alice", "email": "alice@example.com"}}',
    '{"status": "success", "updated_at": "2024-01-15T10:30:00Z"}'
);
```

### Querying JSON

```sql
-- Access JSON fields with dot notation
SELECT
    request_body.user_id,
    request_body.action,
    request_body.fields.name
FROM api_logs;

-- Access nested fields
SELECT
    response_body.status,
    request_body.fields.email
FROM api_logs
WHERE request_body.action = 'update';
```

### JSON vs Map vs Nested

Choose based on your needs:

| Feature | JSON | Map | Nested |
|---------|------|-----|--------|
| Schema flexibility | High | Medium | Low |
| Query performance | Lower | Higher | Highest |
| Type safety | Runtime | Compile-time | Compile-time |
| Indexing | Limited | Limited | Full |
| Best for | Unknown schemas | Labels/tags | Known structures |

## Practical Patterns

### Pattern 1: Event Properties

Store flexible event properties while keeping common fields typed:

```sql
CREATE TABLE events
(
    event_id UUID,
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt64,

    -- Common properties as typed columns
    page_url String,
    session_id String,

    -- Flexible properties as map
    properties Map(String, String),

    -- Numeric properties separate for efficient aggregation
    numeric_properties Map(String, Float64)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, user_id, event_time);
```

### Pattern 2: Time-Series with Tags

```sql
CREATE TABLE metrics
(
    timestamp DateTime CODEC(DoubleDelta, LZ4),

    -- Typed dimensions for common tags
    host LowCardinality(String),
    service LowCardinality(String),
    metric_name LowCardinality(String),

    -- Flexible tags
    tags Map(LowCardinality(String), String),

    -- Value
    value Float64 CODEC(Gorilla, LZ4)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (metric_name, host, timestamp);

-- Query with tag filtering
SELECT
    toStartOfHour(timestamp) AS hour,
    avg(value) AS avg_value
FROM metrics
WHERE metric_name = 'cpu_usage'
  AND tags['environment'] = 'production'
GROUP BY hour
ORDER BY hour;
```

### Pattern 3: Order Line Items

```sql
CREATE TABLE orders
(
    order_id UInt64,
    customer_id UInt64,
    order_date Date,

    -- Nested for line items
    line_items Nested
    (
        sku String,
        name String,
        quantity UInt32,
        unit_price Decimal64(2),
        discount_percent UInt8
    )
)
ENGINE = MergeTree()
ORDER BY (customer_id, order_date);

-- Calculate order totals
SELECT
    order_id,
    arraySum(
        arrayMap(
            (q, p, d) -> q * p * (1 - d / 100),
            line_items.quantity,
            line_items.unit_price,
            line_items.discount_percent
        )
    ) AS order_total
FROM orders;
```

### Pattern 4: User Profiles with Arrays

```sql
CREATE TABLE user_profiles
(
    user_id UInt64,
    created_at DateTime,

    -- Arrays for multi-valued attributes
    interests Array(LowCardinality(String)),
    favorite_categories Array(LowCardinality(String)),
    viewed_products Array(UInt64),

    -- Recent activity as array of tuples
    recent_searches Array(Tuple(query String, timestamp DateTime))
)
ENGINE = ReplacingMergeTree(created_at)
ORDER BY user_id;

-- Find users interested in specific topics
SELECT user_id
FROM user_profiles
WHERE hasAny(interests, ['technology', 'programming']);

-- Get users with overlapping interests
SELECT
    u1.user_id AS user1,
    u2.user_id AS user2,
    arrayIntersect(u1.interests, u2.interests) AS common_interests
FROM user_profiles u1, user_profiles u2
WHERE u1.user_id < u2.user_id
  AND length(arrayIntersect(u1.interests, u2.interests)) > 2;
```

## Performance Considerations

### Indexing Array Contents

Standard indexes don't work inside arrays. Use skip indexes:

```sql
CREATE TABLE tagged_events
(
    event_id UUID,
    tags Array(String),

    -- Bloom filter index for array membership queries
    INDEX idx_tags tags TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY event_id;
```

### Avoiding Array Explosions

Large arrays hurt performance. Consider:

```sql
-- Instead of one row with huge array
-- BAD: stores 10000 items in one array
INSERT INTO events VALUES (1, [item1, item2, ..., item10000]);

-- Split into multiple rows
-- GOOD: each item is its own row
INSERT INTO events VALUES (1, item1), (1, item2), ...;
```

### Map vs Separate Columns

For frequently-queried keys, promote them to columns:

```sql
-- Instead of: labels Map(String, String)
-- If you always filter by environment and region:

CREATE TABLE metrics
(
    -- Promoted to columns for better indexing
    environment LowCardinality(String),
    region LowCardinality(String),

    -- Other labels stay in map
    other_labels Map(String, String)
)
ENGINE = MergeTree()
ORDER BY (environment, region, timestamp);
```

---

Arrays, nested structures, maps, and JSON give you flexibility in ClickHouse without sacrificing too much performance. Use typed arrays and nested columns when you know the structure, maps for flexible tags and labels, and JSON only when the schema is truly unknown. The key is matching your data model to your query patterns.
