# How to Delete Duplicate Rows in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Deduplication, Delete, ReplacingMergeTree, Data Cleanup

Description: Learn how to delete duplicate rows in ClickHouse using ReplacingMergeTree, FINAL keyword, ALTER TABLE DELETE, and deduplication at query time.

---

## Handling Duplicates in ClickHouse

ClickHouse is an append-only system by design. Unlike traditional databases, it does not check for uniqueness on INSERT. Duplicates must be handled via table engine design, query-time filtering, or explicit mutation commands.

## Option 1 - Use ReplacingMergeTree

The best approach is to prevent persisted duplicates at the engine level:

```sql
CREATE TABLE events
(
    event_id UInt64,
    user_id UInt64,
    event_type String,
    event_time DateTime,
    amount Float64,
    version UInt64
)
ENGINE = ReplacingMergeTree(version)
ORDER BY (event_id);
```

On merge, ClickHouse keeps only the row with the highest `version` per `event_id`.

## Reading Deduplicated Data with FINAL

```sql
SELECT *
FROM events FINAL
WHERE event_time >= today() - 7
ORDER BY event_time;
```

`FINAL` forces immediate deduplication at read time.

## Option 2 - Deduplicate at Query Time

When you cannot change the engine, filter duplicates in the query:

```sql
SELECT *
FROM (
    SELECT *,
        row_number() OVER (PARTITION BY event_id ORDER BY event_time DESC) AS rn
    FROM events
)
WHERE rn = 1;
```

Or use `argMax`:

```sql
SELECT
    event_id,
    argMax(user_id, event_time) AS user_id,
    argMax(amount, event_time) AS amount,
    max(event_time) AS event_time
FROM events
GROUP BY event_id;
```

## Option 3 - DELETE Duplicates with ALTER TABLE

For MergeTree tables, use a DELETE mutation via `ALTER TABLE`:

```sql
-- Find duplicates
SELECT event_id, count() AS cnt
FROM events
GROUP BY event_id
HAVING cnt > 1;

-- Delete all copies except the latest
ALTER TABLE events DELETE
WHERE (event_id, event_time) NOT IN (
    SELECT event_id, max(event_time)
    FROM events
    GROUP BY event_id
);
```

## Option 4 - Recreate Table Without Duplicates

For large-scale deduplication, create a new clean table:

```sql
CREATE TABLE events_clean AS events;

INSERT INTO events_clean
SELECT DISTINCT ON (event_id) *
FROM events
ORDER BY event_id, event_time DESC;

RENAME TABLE events TO events_old, events_clean TO events;
DROP TABLE events_old;
```

## Using CollapsingMergeTree for Streaming Deduplication

```sql
CREATE TABLE events_collapsing
(
    event_id UInt64,
    event_time DateTime,
    amount Float64,
    sign Int8
)
ENGINE = CollapsingMergeTree(sign)
ORDER BY event_id;

-- Insert original row
INSERT INTO events_collapsing VALUES (1, '2024-01-01', 100.0, 1);

-- Cancel duplicate: insert with sign=-1
INSERT INTO events_collapsing VALUES (1, '2024-01-01', 100.0, -1);
-- Insert corrected row
INSERT INTO events_collapsing VALUES (1, '2024-01-01', 95.0, 1);
```

## Summary

Duplicates in ClickHouse are best prevented with `ReplacingMergeTree` and eliminated at read time with `FINAL`. For MergeTree tables, use `argMax` in GROUP BY queries, lightweight DELETE mutations, or recreate the table from a deduplicated SELECT to clean existing data.
