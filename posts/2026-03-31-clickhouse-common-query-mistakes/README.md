# Common ClickHouse Query Mistakes and How to Fix Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Optimization, Mistakes, Best Practice, Performance

Description: Learn the most common ClickHouse query mistakes - SELECT star, uniqExact overuse, bad JOIN order, and missing partition pruning - and how to fix each one.

---

Even with a well-designed schema, query mistakes can cripple ClickHouse performance. These are the most common query-level mistakes and their fixes.

## Mistake 1: SELECT * in Production

`SELECT *` reads all columns from disk, even if your application only uses three of them. In a wide table, this wastes 90%+ of I/O.

```sql
-- BAD: reads all 50 columns for each row
SELECT * FROM events WHERE user_id = 42;

-- GOOD: reads only the 3 columns you need
SELECT event_time, event_type, amount
FROM events
WHERE user_id = 42;
```

## Mistake 2: Using uniqExact When Approximate is Fine

`uniqExact()` requires tracking all distinct values, which is slow and memory-intensive. `uniq()` uses a compact approximate-distinct algorithm and is typically accurate enough for analytics workloads.

```sql
-- BAD: exact count requires storing all user_ids in memory
SELECT uniqExact(user_id) FROM events;  -- 180 seconds on 10B rows

-- GOOD: approximate count with a small error margin, much faster
SELECT uniq(user_id) FROM events;  -- 4 seconds on 10B rows
```

## Mistake 3: Joining with the Large Table on the Right

ClickHouse builds a hash table from the right-side table. Putting the large table on the right causes excessive memory usage and slow queries.

```sql
-- BAD: events (billions of rows) on the right
SELECT u.country, count()
FROM users u
JOIN events e ON u.user_id = e.user_id  -- events is right side!
GROUP BY u.country;

-- GOOD: events (large) on the left, users (small) on the right
SELECT u.country, count()
FROM events e
JOIN users u ON e.user_id = u.user_id
GROUP BY u.country;
```

## Mistake 4: Missing Partition Pruning

ClickHouse skips entire partitions when the WHERE clause matches the partition expression. Using a different expression form defeats pruning.

```sql
-- Table partitioned by toYYYYMM(event_time)

-- BAD: range scan does not match partition expression
WHERE event_time BETWEEN '2024-01-01' AND '2024-01-31'
-- ClickHouse may still scan multiple months' partitions

-- GOOD: explicitly match the partition expression
WHERE toYYYYMM(event_time) = 202401
-- Only scans January 2024 partition
```

## Mistake 5: GROUP BY Before Filtering

ClickHouse processes GROUP BY after WHERE, but writing a subquery that groups everything and then filters is much slower.

```sql
-- BAD: aggregates everything, then filters
SELECT country, events
FROM (
    SELECT country, count() AS events
    FROM events
    GROUP BY country
)
WHERE country = 'US';

-- GOOD: filter first, then aggregate
SELECT country, count() AS events
FROM events
WHERE country = 'US'
GROUP BY country;
```

## Mistake 6: Using toDate() on Indexed DateTime

Wrapping an indexed column in a function call prevents index usage.

```sql
-- BAD: index on event_time cannot be used
WHERE toDate(event_time) = '2024-01-15'

-- GOOD: range scan that uses the primary index
WHERE event_time >= '2024-01-15 00:00:00'
  AND event_time < '2024-01-16 00:00:00'
```

## Mistake 7: Not Using countIf

Multiple subqueries for conditional counts are much slower than a single `countIf` scan.

```sql
-- BAD: three separate full-table scans
SELECT
    (SELECT count() FROM events WHERE event_type = 'click') AS clicks,
    (SELECT count() FROM events WHERE event_type = 'view') AS views,
    (SELECT count() FROM events WHERE event_type = 'purchase') AS purchases;

-- GOOD: single scan with conditional counts
SELECT
    countIf(event_type = 'click') AS clicks,
    countIf(event_type = 'view') AS views,
    countIf(event_type = 'purchase') AS purchases
FROM events;
```

## Summary

The most impactful ClickHouse query fixes are: select only needed columns, use `uniq()` over `uniqExact()` for approximate analytics, keep large tables on the left side of JOINs, match partition expressions exactly in WHERE clauses, and use `countIf` instead of multiple subqueries.
