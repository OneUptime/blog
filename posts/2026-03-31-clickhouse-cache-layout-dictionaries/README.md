# How to Create Cache Layout Dictionaries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Cache Layout, Lookup, Performance

Description: Learn how to create cache layout dictionaries in ClickHouse for memory-efficient lookups when only a fraction of the dictionary fits in RAM.

---

## What is a Cache Layout Dictionary

The `cache` layout stores only a subset of dictionary entries in memory. When a key is not in cache, ClickHouse fetches it from the source (database, file, HTTP). This makes cache dictionaries suitable for large dictionaries that don't fit in RAM.

## When to Use Cache Layout

- Dictionary has millions of entries but only a subset is queried frequently
- Memory is constrained and full in-memory loading is not feasible
- Source data changes frequently and you want near-realtime freshness

## Creating a Cache Dictionary

```sql
-- Source: a large users table
CREATE DICTIONARY user_profiles_cache (
    user_id UInt64,
    display_name String DEFAULT 'Unknown',
    email String DEFAULT '',
    account_tier String DEFAULT 'free'
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(
    HOST 'localhost'
    PORT 9000
    USER 'default'
    DB 'default'
    TABLE 'users'
    WHERE 'is_active = 1'
))
LAYOUT(CACHE(SIZE_IN_CELLS 100000))
LIFETIME(MIN 300 MAX 600);
```

`SIZE_IN_CELLS` sets the number of entries the cache can hold.

## Cache from MySQL Source

```sql
CREATE DICTIONARY customer_cache (
    customer_id UInt64,
    name String DEFAULT '',
    country String DEFAULT ''
)
PRIMARY KEY customer_id
SOURCE(MYSQL(
    HOST 'mysql-host'
    PORT 3306
    USER 'reader'
    PASSWORD 'secret'
    DB 'crm'
    TABLE 'customers'
))
LAYOUT(CACHE(SIZE_IN_CELLS 500000))
LIFETIME(MIN 60 MAX 120);
```

## Cache Lookup Behavior

- Cache hit: instant return from memory
- Cache miss: blocks until source is queried

```sql
-- This query may be slow if many user_ids are not in cache
SELECT
    event_id,
    user_id,
    dictGetString('user_profiles_cache', 'display_name', user_id) AS name
FROM events
WHERE event_time >= today();
```

## Monitor Cache Hit Rate

```sql
SELECT
    name,
    element_count,
    hit_rate,
    formatReadableSize(bytes_allocated) AS size,
    last_successful_update_time
FROM system.dictionaries
WHERE type = 'Cache';
```

A `hit_rate` below 0.8 suggests the cache is too small. Increase `SIZE_IN_CELLS`.

## Complex Cache: SSD Cache Layout

For very large dictionaries, use `ssd_cache` to store data on disk with a hot in-memory layer:

```sql
LAYOUT(SSD_CACHE(
    BLOCK_SIZE 4096
    FILE_SIZE 16000000000  -- 16 GB on SSD
    READ_BUFFER_SIZE 1048576
    WRITE_BUFFER_SIZE 1048576
    PATH '/var/lib/clickhouse/user_files/dict_cache'
))
```

## Cache Invalidation

Cache entries expire based on the `LIFETIME` settings. Force a cache refresh:

```sql
SYSTEM RELOAD DICTIONARY user_profiles_cache;
```

## Limitations

- Cache dictionaries are not replicated - each replica has its own cache
- Query performance is non-deterministic due to cache miss latency
- Not suitable for queries that need to join with the full dictionary

## Summary

Cache layout dictionaries are ideal when your dictionary is too large to fit entirely in RAM. By caching only hot entries, you can perform fast lookups on large datasets while keeping memory usage bounded. Monitor cache hit rates and tune `SIZE_IN_CELLS` to balance memory and performance.
