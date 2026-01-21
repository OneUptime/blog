# How to Speed Up ClickHouse Joins with Dictionaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionaries, Joins, Performance, Database, Analytics, Optimization

Description: A practical guide to using ClickHouse external dictionaries for fast dimension lookups, replacing expensive JOINs with dictionary functions for dramatically improved query performance.

---

JOINs in ClickHouse can be expensive, especially when joining large fact tables with dimension tables. Dictionaries provide a faster alternative by loading dimension data into memory for instant lookups. This guide shows how to replace slow JOINs with fast dictionary functions.

## The Problem with JOINs

Consider a typical analytics query joining events with user data:

```sql
-- Slow: JOIN scans both tables
SELECT
    e.event_type,
    u.country,
    count() AS events
FROM events e
JOIN users u ON e.user_id = u.user_id
WHERE e.event_time >= today() - 7
GROUP BY e.event_type, u.country;
```

This JOIN reads the entire users table for every query. With millions of users, this gets slow.

## How Dictionaries Work

Dictionaries load data into memory as key-value structures. Instead of JOINing, you look up values directly:

```sql
-- Fast: Dictionary lookup
SELECT
    event_type,
    dictGet('users_dict', 'country', user_id) AS country,
    count() AS events
FROM events
WHERE event_time >= today() - 7
GROUP BY event_type, country;
```

The lookup is O(1) instead of scanning a table.

## Creating Dictionaries

### From ClickHouse Table

The most common source is another ClickHouse table:

```sql
-- Source table
CREATE TABLE users
(
    user_id UInt64,
    name String,
    email String,
    country String,
    created_at DateTime
)
ENGINE = MergeTree()
ORDER BY user_id;

-- Create dictionary
CREATE DICTIONARY users_dict
(
    user_id UInt64,
    name String,
    email String,
    country String,
    created_at DateTime
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(
    TABLE 'users'
    DB 'default'
))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 360);
```

### From External Database

Load from PostgreSQL, MySQL, or other sources:

```sql
-- From PostgreSQL
CREATE DICTIONARY products_dict
(
    product_id UInt64,
    name String,
    category String,
    price Decimal64(2)
)
PRIMARY KEY product_id
SOURCE(POSTGRESQL(
    HOST 'postgres-server'
    PORT 5432
    USER 'readonly'
    PASSWORD 'secret'
    DB 'products'
    TABLE 'products'
))
LAYOUT(HASHED())
LIFETIME(MIN 3600 MAX 3660);
```

### From HTTP Endpoint

Load from REST APIs or files:

```sql
CREATE DICTIONARY geo_dict
(
    ip_start UInt32,
    ip_end UInt32,
    country String,
    city String
)
PRIMARY KEY ip_start
SOURCE(HTTP(
    URL 'https://example.com/geo-data.csv'
    FORMAT 'CSVWithNames'
))
LAYOUT(RANGE_HASHED())
RANGE(MIN ip_start MAX ip_end)
LIFETIME(MIN 86400 MAX 86460);
```

### From Local File

```sql
CREATE DICTIONARY config_dict
(
    key String,
    value String
)
PRIMARY KEY key
SOURCE(FILE(
    PATH '/etc/clickhouse-server/config_values.csv'
    FORMAT 'CSVWithNames'
))
LAYOUT(HASHED())
LIFETIME(MIN 60 MAX 120);
```

## Dictionary Layouts

Choose the layout based on your key type and query patterns:

### HASHED

Best for single-key lookups with unique keys:

```sql
LAYOUT(HASHED())

-- Supports:
dictGet('dict', 'attr', key)
dictHas('dict', key)
```

### HASHED_ARRAY

For dictionaries with array attributes:

```sql
LAYOUT(HASHED_ARRAY())
```

### COMPLEX_KEY_HASHED

For composite keys:

```sql
CREATE DICTIONARY product_pricing
(
    product_id UInt64,
    region String,
    price Decimal64(2)
)
PRIMARY KEY product_id, region
SOURCE(CLICKHOUSE(TABLE 'pricing'))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(300);

-- Query with composite key
SELECT dictGet('product_pricing', 'price', (product_id, region))
FROM orders;
```

### RANGE_HASHED

For range-based lookups (common for time-varying data):

```sql
CREATE DICTIONARY exchange_rates
(
    currency String,
    valid_from Date,
    valid_to Date,
    rate Float64
)
PRIMARY KEY currency
SOURCE(CLICKHOUSE(TABLE 'rates'))
LAYOUT(RANGE_HASHED())
RANGE(MIN valid_from MAX valid_to)
LIFETIME(3600);

-- Query with date in range
SELECT dictGet('exchange_rates', 'rate', currency, toDate('2024-01-15'))
FROM transactions;
```

### CACHE

For large dictionaries that don't fit in memory:

```sql
LAYOUT(CACHE(SIZE_IN_CELLS 1000000))
```

Only keeps recently accessed entries in memory.

### DIRECT

No caching, queries source directly:

```sql
LAYOUT(DIRECT())
```

Useful when data changes frequently and you need real-time values.

## Dictionary Functions

### Basic Lookups

```sql
-- Get attribute value
SELECT dictGet('users_dict', 'country', user_id) AS country
FROM events;

-- Get with default value
SELECT dictGetOrDefault('users_dict', 'country', user_id, 'Unknown') AS country
FROM events;

-- Check if key exists
SELECT dictHas('users_dict', user_id) AS user_exists
FROM events;

-- Get multiple attributes
SELECT
    dictGet('users_dict', 'name', user_id) AS name,
    dictGet('users_dict', 'country', user_id) AS country,
    dictGet('users_dict', 'created_at', user_id) AS signup_date
FROM events;
```

### Typed Functions

Use typed functions for better performance:

```sql
-- Typed getters (slightly faster)
SELECT dictGetString('users_dict', 'name', user_id) AS name
FROM events;

SELECT dictGetUInt64('users_dict', 'loyalty_points', user_id) AS points
FROM events;
```

### Hierarchical Lookups

For tree structures like categories or org charts:

```sql
CREATE DICTIONARY categories_dict
(
    category_id UInt64,
    parent_id UInt64 HIERARCHICAL,
    name String
)
PRIMARY KEY category_id
SOURCE(CLICKHOUSE(TABLE 'categories'))
LAYOUT(HASHED())
LIFETIME(3600);

-- Get all ancestors
SELECT dictGetHierarchy('categories_dict', category_id) AS path
FROM products;

-- Check if ancestor
SELECT dictIsIn('categories_dict', category_id, 1) AS is_in_electronics
FROM products;
```

## Replacing JOINs with Dictionaries

### Before: Slow JOIN

```sql
-- Query takes 10 seconds
SELECT
    e.event_type,
    u.country,
    u.subscription_tier,
    p.category,
    count() AS events,
    uniq(e.user_id) AS users
FROM events e
JOIN users u ON e.user_id = u.user_id
JOIN products p ON e.product_id = p.product_id
WHERE e.event_time >= today() - 7
GROUP BY e.event_type, u.country, u.subscription_tier, p.category
ORDER BY events DESC;
```

### After: Fast Dictionary Lookups

```sql
-- Query takes 0.5 seconds
SELECT
    event_type,
    dictGet('users_dict', 'country', user_id) AS country,
    dictGet('users_dict', 'subscription_tier', user_id) AS subscription_tier,
    dictGet('products_dict', 'category', product_id) AS category,
    count() AS events,
    uniq(user_id) AS users
FROM events
WHERE event_time >= today() - 7
GROUP BY event_type, country, subscription_tier, category
ORDER BY events DESC;
```

## Managing Dictionaries

### Check Dictionary Status

```sql
-- List all dictionaries
SELECT
    name,
    status,
    element_count,
    bytes_allocated,
    loading_duration
FROM system.dictionaries;

-- Check specific dictionary
SELECT * FROM system.dictionaries WHERE name = 'users_dict';
```

### Reload Dictionary

```sql
-- Reload single dictionary
SYSTEM RELOAD DICTIONARY users_dict;

-- Reload all dictionaries
SYSTEM RELOAD DICTIONARIES;
```

### Dictionary Metrics

```sql
-- Query performance
SELECT
    name,
    hit_rate,
    found_rate,
    queries
FROM system.dictionaries;
```

## Best Practices

### 1. Size Your Memory

Estimate memory usage before creating large dictionaries:

```sql
-- Check current size
SELECT
    name,
    formatReadableSize(bytes_allocated) AS memory_used,
    element_count
FROM system.dictionaries;

-- Estimate for new dictionary
SELECT
    count() AS rows,
    sum(length(name)) + count() * 8 AS estimated_bytes
FROM users;
```

### 2. Set Appropriate Lifetime

Balance freshness vs reload frequency:

```sql
-- Fast-changing data: short lifetime
LIFETIME(MIN 60 MAX 120)

-- Slow-changing data: longer lifetime
LIFETIME(MIN 3600 MAX 3660)

-- Static data: very long lifetime
LIFETIME(MIN 86400 MAX 86460)
```

### 3. Handle Missing Keys

Always handle cases where keys don't exist:

```sql
-- Use OrDefault variant
SELECT dictGetOrDefault('users_dict', 'name', user_id, 'Unknown User')
FROM events;

-- Or check existence first
SELECT
    CASE
        WHEN dictHas('users_dict', user_id)
        THEN dictGet('users_dict', 'name', user_id)
        ELSE 'Anonymous'
    END AS user_name
FROM events;
```

### 4. Use CACHE for Large Dictionaries

When dictionary doesn't fit in memory:

```sql
CREATE DICTIONARY large_dict
(
    ...
)
LAYOUT(CACHE(SIZE_IN_CELLS 10000000))  -- 10M entries in cache
LIFETIME(MIN 0 MAX 0);  -- Never expire, rely on LRU
```

### 5. Preload on Startup

For critical dictionaries, ensure they load at startup:

```xml
<!-- In config.xml -->
<dictionaries_lazy_load>false</dictionaries_lazy_load>
```

## Advanced Patterns

### Pattern 1: Enriching Events at Insert Time

Use dictionaries in materialized views to denormalize at insert:

```sql
CREATE MATERIALIZED VIEW events_enriched
ENGINE = MergeTree()
ORDER BY (event_time, user_id)
AS SELECT
    event_time,
    user_id,
    event_type,
    -- Enrich with dictionary values
    dictGet('users_dict', 'country', user_id) AS country,
    dictGet('users_dict', 'segment', user_id) AS segment
FROM events_raw;
```

### Pattern 2: Slowly Changing Dimensions

Use RANGE_HASHED for time-varying attributes:

```sql
CREATE DICTIONARY user_segments_history
(
    user_id UInt64,
    valid_from DateTime,
    valid_to DateTime,
    segment String
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE 'user_segment_history'))
LAYOUT(RANGE_HASHED())
RANGE(MIN valid_from MAX valid_to)
LIFETIME(3600);

-- Get segment at event time
SELECT
    event_time,
    dictGet('user_segments_history', 'segment', user_id, event_time) AS segment
FROM events;
```

### Pattern 3: Geo IP Lookups

```sql
CREATE DICTIONARY geo_ip
(
    network String,
    start_ip UInt32,
    end_ip UInt32,
    country_code String,
    country_name String,
    city String
)
PRIMARY KEY network
SOURCE(FILE(PATH '/var/lib/clickhouse/geo/GeoLite2-City.csv' FORMAT CSVWithNames))
LAYOUT(IP_TRIE())
LIFETIME(86400);

-- Look up IP address
SELECT
    dictGet('geo_ip', 'country_name', tuple(IPv4StringToNum(ip_address))) AS country
FROM access_logs;
```

## Troubleshooting

### Dictionary Not Loading

```sql
-- Check for errors
SELECT
    name,
    status,
    last_exception
FROM system.dictionaries
WHERE status != 'LOADED';
```

### Slow Lookups

```sql
-- Check hit rate (should be high for CACHE layout)
SELECT name, hit_rate FROM system.dictionaries;

-- If using CACHE, increase size
-- If using DIRECT, switch to HASHED
```

### Memory Issues

```sql
-- Find large dictionaries
SELECT
    name,
    formatReadableSize(bytes_allocated) AS size
FROM system.dictionaries
ORDER BY bytes_allocated DESC;
```

---

Dictionaries transform ClickHouse's JOIN performance by replacing table scans with O(1) lookups. Use HASHED layout for most dimension tables, RANGE_HASHED for time-varying data, and CACHE when data doesn't fit in memory. The performance difference between a JOIN and a dictionary lookup can be 10-100x for typical analytics queries.
