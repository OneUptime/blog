# How to Optimize LIMIT with Large Offsets in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Optimization, Pagination, Performance, Limit

Description: Learn how to optimize slow LIMIT with large OFFSET queries in MySQL using keyset pagination and deferred joins to avoid full scans.

---

## Overview

Pagination with `LIMIT` and `OFFSET` is a common pattern, but it degrades significantly as the offset grows. `LIMIT 20 OFFSET 100000` requires MySQL to read and discard 100,000 rows before returning 20. This guide covers efficient alternatives.

## Why Large Offsets Are Slow

MySQL must scan and discard all rows up to the offset before returning results:

```sql
-- Fast: small offset
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 0;

-- Slow: MySQL scans 100,000 rows, discards them, returns 20
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000;
```

Even with an index on `id`, MySQL still reads 100,000 index entries. This scales linearly - page 10,000 is 10,000 times slower than page 1.

## Solution 1: Keyset Pagination (Seek Method)

Instead of using an offset, remember the last row's value from the previous page and use a WHERE clause:

```sql
-- First page
SELECT * FROM orders ORDER BY id LIMIT 20;

-- Next page (last_id = 20 from previous page)
SELECT * FROM orders
WHERE id > 20
ORDER BY id LIMIT 20;
```

This performs a range scan starting from the known position - no rows are discarded. Performance is constant regardless of page depth.

### Keyset with Multiple Sort Columns

For sorting on non-unique columns, include the primary key as a tiebreaker:

```sql
-- First page: sort by created_at, id as tiebreaker
SELECT id, created_at FROM orders
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Next page: pass last row's created_at and id
SELECT id, created_at FROM orders
WHERE (created_at, id) < ('2024-06-01 12:00:00', 5432)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Ensure a composite index exists:

```sql
CREATE INDEX idx_orders_created_id ON orders (created_at DESC, id DESC);
```

## Solution 2: Deferred Join

If you must use OFFSET, use a deferred join to minimize data fetched before the offset:

```sql
-- Slow: retrieves all columns for each scanned row
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000;

-- Faster: find IDs first (index-only), then fetch full rows
SELECT o.*
FROM orders o
JOIN (
  SELECT id FROM orders ORDER BY id LIMIT 20 OFFSET 100000
) AS page_ids ON o.id = page_ids.id
ORDER BY o.id;
```

The subquery scans only the narrow index, then full rows are fetched only for the 20 matching IDs.

## Solution 3: Partition by Range for Known Ranges

If pagination always covers a known date or ID range, partition the query:

```sql
-- Instead of paginating all orders, scope to a date range
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY id
LIMIT 20 OFFSET 500;
```

The offset is now relative to a smaller subset, reducing scan cost.

## Solution 4: Count-Based Optimization

Avoid `SELECT COUNT(*)` for total page counts on large tables. Use an approximation:

```sql
SELECT TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'orders';
```

This avoids the expensive count query that would scan the entire table.

## Benchmarking the Improvement

Compare execution times:

```sql
-- Baseline: OFFSET approach
EXPLAIN ANALYZE SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 100000;

-- Optimized: keyset approach
EXPLAIN ANALYZE SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 20;
```

## Monitoring Pagination Performance

Use OneUptime to track slow query rates over time. As datasets grow, OFFSET-based pagination naturally degrades - monitoring helps you catch the problem before it impacts users.

## Summary

Large LIMIT/OFFSET queries in MySQL degrade linearly because MySQL must scan and discard all preceding rows. Replace OFFSET pagination with keyset (seek) pagination using WHERE clauses on the last seen value. When OFFSET is unavoidable, use deferred joins to limit data retrieval to only the target page IDs.
