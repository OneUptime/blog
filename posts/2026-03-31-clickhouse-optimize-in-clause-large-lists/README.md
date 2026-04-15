# How to Optimize IN Clause with Large Lists in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, IN Clause, Performance, Query Optimization, Set, Index

Description: Learn how to optimize ClickHouse queries with large IN clause lists using hashed sets, join tables, bloom filters, and query structure improvements.

---

The `IN` clause with large value lists is common in analytical queries but can become a bottleneck when lists contain thousands or millions of values. ClickHouse provides several strategies to handle large IN lists efficiently.

## How ClickHouse Processes IN Clauses

For a literal IN list, ClickHouse builds a hash set and checks each row against it. For subqueries in IN, it materializes the subquery result as a hash set. The hash set lookup itself is O(1), but building and scanning it for every granule has overhead.

## Using IN with a Hashed Set

ClickHouse automatically uses a hash set for IN literals:

```sql
-- Efficient for hundreds of values
SELECT event_id, user_id, event_type
FROM events
WHERE user_id IN (1001, 1002, 1003, 1005, 1008, 1013);
```

For very large lists (10,000+ values), consider whether a JOIN is cleaner:

```sql
-- 50,000 user IDs: use a temporary table instead
CREATE TEMPORARY TABLE target_users (user_id UInt64) ENGINE = Memory;
INSERT INTO target_users VALUES (1001), (1002), ...; -- bulk insert

SELECT e.event_id, e.user_id
FROM events e
INNER JOIN target_users t ON e.user_id = t.user_id;
```

## Using a Set Engine Table

For recurring large IN lists, use a `Set` engine table:

```sql
CREATE TABLE premium_users (user_id UInt64)
ENGINE = Set();

-- Populate once
INSERT INTO premium_users
SELECT user_id FROM users WHERE subscription_tier = 'premium';

-- IN check is O(1) per row
SELECT count() FROM events
WHERE user_id IN premium_users;
```

Refresh the set periodically:

```sql
-- Truncate and reload
TRUNCATE TABLE premium_users;
INSERT INTO premium_users SELECT user_id FROM users WHERE subscription_tier = 'premium';
```

## Bloom Filter for IN-Like Queries

When filtering on a non-primary-key column, a bloom filter index speeds up scans:

```sql
CREATE TABLE transactions (
    transaction_id UUID,
    user_id UInt64,
    merchant_id UInt32,
    amount Decimal(18, 2),
    INDEX merchant_bloom merchant_id TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = MergeTree()
ORDER BY (user_id, transaction_id);

-- Bloom filter skips granules not containing these merchants
SELECT sum(amount) FROM transactions
WHERE merchant_id IN (101, 202, 303, 404);
```

## GLOBAL IN for Distributed Queries

In a distributed setup, use `GLOBAL IN` to avoid re-running the subquery on each shard:

```sql
-- Without GLOBAL: inner query runs on every shard
SELECT * FROM distributed_events
WHERE user_id IN (SELECT user_id FROM users WHERE country = 'CA');

-- With GLOBAL: inner query runs once, result broadcast to all shards
SELECT * FROM distributed_events
WHERE user_id GLOBAL IN (SELECT user_id FROM users WHERE country = 'CA');
```

## Partitioning to Reduce IN List Size

If your IN list always corresponds to a partition value, structure your queries to exploit partition pruning:

```sql
-- If partitioned by toYYYYMM(event_time), combine partition filter
SELECT * FROM events
WHERE event_time >= '2026-01-01'
  AND user_id IN (SELECT user_id FROM high_value_users);
```

## Checking IN Performance

Measure how many rows are being matched:

```sql
SELECT
    read_rows,
    result_rows,
    query_duration_ms,
    ProfileEvents['SelectedMarks'] AS selected_marks
FROM system.query_log
WHERE query LIKE '%IN premium_users%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Summary

Optimize large IN clauses in ClickHouse by using `Set` engine tables for frequently reused ID lists, `GLOBAL IN` for distributed queries, bloom filter indexes for non-primary-key columns, and temporary Memory tables for one-off large lists. Always benchmark with EXPLAIN to verify index usage and measure actual marks scanned.
