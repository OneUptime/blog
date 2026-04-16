# How to Create Hashed Layout Dictionaries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Hashed Layout, Lookup, Performance

Description: Learn how to create hashed layout dictionaries in ClickHouse for fast in-memory hash table lookups with arbitrary key types and large key spaces.

---

## What is a Hashed Layout Dictionary

The `hashed` layout stores dictionary data in a hash table. Unlike `flat`, it supports any UInt64 key values including sparse, large, or non-sequential IDs. It is the most commonly used dictionary layout for production lookups.

## Creating a Hashed Dictionary from a Table

```sql
-- Source table with non-sequential IDs
CREATE TABLE user_segments_data (
    user_id UInt64,
    segment LowCardinality(String),
    tier String,
    is_premium UInt8
) ENGINE = MergeTree() ORDER BY user_id;

CREATE DICTIONARY user_segments_dict (
    user_id UInt64,
    segment String DEFAULT 'unknown',
    tier String DEFAULT 'free',
    is_premium UInt8 DEFAULT 0
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE 'user_segments_data' DB 'default'))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);
```

## Hashed vs. Flat

Use `hashed` when:
- Keys are sparse (e.g., UUIDs converted to UInt64 or large order IDs)
- Key range exceeds 500,000
- Memory efficiency matters more than peak speed

```text
Flat:    Fastest, but pre-allocates array[max_key] in memory
Hashed:  Slightly slower, only allocates memory for actual keys
```

## SPARSE_HASHED Layout

For dictionaries where memory is critical, use `sparse_hashed`:

```sql
CREATE DICTIONARY large_user_dict (
    user_id UInt64,
    country String DEFAULT 'unknown'
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE 'users_data'))
LAYOUT(SPARSE_HASHED())
LIFETIME(3600);
```

`sparse_hashed` uses less memory but is slightly slower than `hashed`.

## Multi-Value Lookup

```sql
SELECT
    e.event_id,
    e.user_id,
    dictGetString('user_segments_dict', 'segment', e.user_id) AS segment,
    dictGetString('user_segments_dict', 'tier', e.user_id) AS tier,
    dictGetUInt8('user_segments_dict', 'is_premium', e.user_id) AS is_premium
FROM events e
WHERE e.event_time >= today()
LIMIT 100;
```

## Load from MySQL Source

```sql
CREATE DICTIONARY product_dict (
    product_id UInt64,
    name String DEFAULT '',
    category String DEFAULT '',
    price Float64 DEFAULT 0.0
)
PRIMARY KEY product_id
SOURCE(MYSQL(
    HOST 'mysql-host'
    PORT 3306
    USER 'readonly_user'
    PASSWORD 'secret'
    DB 'catalog'
    TABLE 'products'
))
LAYOUT(HASHED())
LIFETIME(MIN 600 MAX 1200);
```

## Check Memory Usage

```sql
SELECT
    name,
    element_count,
    formatReadableSize(bytes_allocated) AS memory_used,
    last_successful_update_time,
    loading_duration
FROM system.dictionaries
WHERE type = 'Hashed';
```

## Manual Reload

```sql
SYSTEM RELOAD DICTIONARY user_segments_dict;
```

## Sharded Hashed for Large Dictionaries

For very large dictionaries, use the `SHARDS` parameter of `HASHED` (or `SPARSE_HASHED`) to distribute across multiple hash tables for parallel loading:

```sql
LAYOUT(HASHED(SHARDS 16))
```

## Summary

Hashed layout dictionaries are the workhorse of ClickHouse lookups. They support arbitrary key values, scale to millions of entries, and provide sub-microsecond lookup times. Use `hashed` for most production workloads and `sparse_hashed` when memory is constrained.
