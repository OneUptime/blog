# How to Implement a Counter Table in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Concurrency, Pattern, Lock

Description: Learn how to implement high-throughput counter tables in MySQL using slot-based sharding to minimize lock contention on hot rows.

---

## The Problem with Simple Counters

A naive counter table has a single row per entity being counted:

```sql
CREATE TABLE counters (
    entity_id INT PRIMARY KEY,
    count INT NOT NULL DEFAULT 0
);
```

Under high concurrent write load, every increment hits the same row, causing severe row lock contention. InnoDB can only allow one transaction at a time to update a given row, creating a bottleneck.

## Slot-Based Counter Table

The solution is to shard the counter across multiple rows (slots). Each increment randomly picks one slot to update. Reads sum all slots:

```sql
CREATE TABLE counters (
    entity_id INT NOT NULL,
    slot TINYINT NOT NULL,
    count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (entity_id, slot)
);

-- Initialize a counter with 10 slots
INSERT INTO counters (entity_id, slot, count)
SELECT 42, slot_num, 0
FROM (
    SELECT 0 AS slot_num UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
    UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
    UNION SELECT 8 UNION SELECT 9
) AS slots;
```

## Incrementing the Counter

Each write picks a random slot, distributing contention across 10 rows:

```sql
-- Increment counter for entity 42 (random slot 0-9)
SET @slot = FLOOR(RAND() * 10);
UPDATE counters
SET count = count + 1
WHERE entity_id = 42
  AND slot = @slot;
```

From application code:

```python
import random
import mysql.connector

def increment_counter(conn, entity_id, num_slots=10):
    slot = random.randint(0, num_slots - 1)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE counters
        SET count = count + 1
        WHERE entity_id = %s AND slot = %s
    """, (entity_id, slot))
    conn.commit()
```

## Reading the Counter

To get the total, sum across all slots:

```sql
-- Get current count for entity 42
SELECT SUM(count) AS total
FROM counters
WHERE entity_id = 42;
```

## Resetting a Counter

```sql
-- Reset counter to zero
UPDATE counters
SET count = 0
WHERE entity_id = 42;
```

## Tracking Multiple Metrics

Extend the pattern to track different counter types:

```sql
CREATE TABLE entity_counters (
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    metric VARCHAR(50) NOT NULL,
    slot TINYINT NOT NULL,
    count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (entity_type, entity_id, metric, slot),
    INDEX idx_entity_metric (entity_type, entity_id, metric)
);

-- Track page views and downloads separately
SET @slot = FLOOR(RAND() * 10);
UPDATE entity_counters
SET count = count + 1
WHERE entity_type = 'article'
  AND entity_id = 101
  AND metric = 'page_views'
  AND slot = @slot;

-- Read article view count
SELECT SUM(count) AS total_views
FROM entity_counters
WHERE entity_type = 'article'
  AND entity_id = 101
  AND metric = 'page_views';
```

## Benchmark Comparison

Without slot sharding, concurrent increments on one row serialize through a single row lock. With 10 slots, contention is reduced by approximately 10x since concurrent transactions distribute across different rows.

```sql
-- Check lock wait frequency before and after implementing slots
SHOW STATUS LIKE 'Innodb_row_lock_waits';
SHOW STATUS LIKE 'Innodb_row_lock_time_avg';
```

## Choosing the Right Number of Slots

The number of slots should match your peak concurrent writes per second. A rule of thumb:
- Up to 100 writes/sec: 10 slots
- Up to 1000 writes/sec: 50-100 slots
- Over 1000 writes/sec: consider Redis for the hot path with periodic MySQL sync

## Summary

The slot-based counter table pattern solves InnoDB row lock contention by distributing increments across multiple slots per counter. Reads sum the slots for an accurate total. This simple technique scales counter throughput nearly linearly with the number of slots, handling thousands of concurrent increments per second without application-level coordination.
