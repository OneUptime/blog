# How to Use cityHash64() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, Sharding, Deduplication, Performance

Description: Learn how to use cityHash64() in ClickHouse for fast 64-bit non-cryptographic hashing, sharding, routing, and deduplication workflows.

---

ClickHouse provides a rich set of hash functions for tasks that do not require cryptographic security. `cityHash64()` is one of the most commonly used - it computes a fast 64-bit hash from one or more values using Google's CityHash algorithm. Because the output is deterministic and well-distributed, it is ideal for consistent hashing, sharding, and generating stable row identifiers.

## Basic Usage

`cityHash64()` accepts one or more arguments of any type. When multiple arguments are passed, they are hashed together as a combined value.

```sql
-- Hash a single string value
SELECT cityHash64('hello world');

-- Hash multiple columns together to create a composite key
SELECT
    user_id,
    event_type,
    cityHash64(user_id, event_type, toDate(event_time)) AS row_hash
FROM events
LIMIT 10;
```

## Consistent Sharding with cityHash64

A common use case is distributing rows across a fixed number of shards. The modulo operator gives a stable shard assignment for any input value.

```sql
-- Assign rows to one of 8 shards based on user_id
SELECT
    user_id,
    cityHash64(user_id) % 8 AS shard_id
FROM users
LIMIT 20;
```

Because `cityHash64` is deterministic, the same `user_id` always maps to the same shard. This is critical for consistent routing in distributed systems.

## Load Distribution and Request Routing

You can use `cityHash64` to evenly route requests or tasks across a pool of workers. The following example simulates assigning jobs to workers.

```sql
-- Distribute jobs across 4 workers
SELECT
    job_id,
    job_type,
    cityHash64(job_id) % 4 AS worker_id
FROM jobs
ORDER BY worker_id;
```

## Generating Stable Row IDs

When ingesting data from sources without a natural primary key, `cityHash64` can generate a stable surrogate ID from the row content. The ID is reproducible - the same input always produces the same hash.

```sql
-- Generate a stable row ID from content fields
SELECT
    cityHash64(
        toString(user_id),
        toString(page_url),
        toString(toStartOfMinute(event_time))
    ) AS row_id,
    user_id,
    page_url,
    event_time
FROM page_views
LIMIT 10;
```

## Deduplication Using cityHash64

You can identify duplicate rows by grouping on a hash of all relevant columns.

```sql
-- Detect duplicate rows by hashing all columns
SELECT
    cityHash64(user_id, session_id, event_type, event_time) AS row_hash,
    count() AS occurrences
FROM raw_events
GROUP BY row_hash
HAVING occurrences > 1
ORDER BY occurrences DESC
LIMIT 20;
```

## Sampling with cityHash64

`cityHash64` enables deterministic sampling - the same sample is selected every time you run the query. This is useful for reproducible analytics and A/B test analysis.

```sql
-- Sample approximately 10% of users deterministically
SELECT *
FROM users
WHERE cityHash64(user_id) % 10 = 0;

-- Sample 1% of events for fast exploratory analysis
SELECT
    event_type,
    count() AS sampled_count
FROM events
WHERE cityHash64(user_id, toDate(event_time)) % 100 = 0
GROUP BY event_type
ORDER BY sampled_count DESC;
```

## Using cityHash64 in a MergeTree Table

ClickHouse tables often use hash-based sharding keys. Here is a table definition that uses `cityHash64` as the distribution key in a sharded setup.

```sql
CREATE TABLE user_events
(
    event_id     UInt64,
    user_id      UInt64,
    event_type   String,
    event_time   DateTime,
    row_hash     UInt64 MATERIALIZED cityHash64(user_id, event_type, event_time)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);
```

The `MATERIALIZED` column ensures the hash is computed and stored automatically on insert.

## Comparing cityHash64 to Other Hash Functions

```sql
-- Compare hash outputs from different algorithms on the same input
SELECT
    'hello world'            AS input,
    cityHash64('hello world')  AS city64,
    xxHash64('hello world')    AS xx64,
    farmHash64('hello world')  AS farm64;
```

## Summary

`cityHash64()` is the go-to general-purpose hash function in ClickHouse. It is fast, deterministic, and produces well-distributed 64-bit values that are well suited for sharding, routing, sampling, and deduplication. When you need consistent hashing across multiple columns, simply pass all relevant values as arguments and ClickHouse combines them into a single hash. For cryptographic use cases, prefer SHA-256 - `cityHash64` is not designed to be collision-resistant against adversarial inputs.
