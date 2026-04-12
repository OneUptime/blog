# How to Avoid Filesort in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Performance, Query, Optimization

Description: Learn strategies to eliminate Using filesort in MySQL queries by designing composite indexes that match ORDER BY and WHERE clauses, avoiding unnecessary sorts.

---

## What Is Filesort and Why Avoid It?

MySQL's "filesort" is an in-memory (or on-disk) sorting operation performed when no index can supply rows in the required order. Despite the name it does not always write to disk - small sorts stay in `sort_buffer_size` memory - but it always adds CPU overhead and latency on top of the row fetch.

`EXPLAIN` reveals filesort via `Extra: Using filesort`.

## The Index-Based Sort Alternative

When MySQL can read rows from an index in the exact order needed by ORDER BY, it skips the filesort entirely. This requires:

1. The index covers the ORDER BY columns in the same order
2. All ORDER BY columns sort in the same direction (or use MySQL 8.0 descending indexes)
3. Any equality-filter columns (WHERE col = val) appear before the sort columns in the index

## Pattern 1: Simple Sort

```sql
-- No index on published_at
EXPLAIN SELECT title FROM articles ORDER BY published_at DESC;
-- Extra: Using filesort

-- Add index matching sort direction
CREATE INDEX idx_published ON articles(published_at DESC);

EXPLAIN SELECT title FROM articles ORDER BY published_at DESC;
-- Extra: no "Using filesort" (filesort eliminated)
```

## Pattern 2: Filter Then Sort (Most Common)

```sql
-- Query: filter by author, sort by date
EXPLAIN SELECT id, title FROM articles
WHERE author_id = 10
ORDER BY published_at DESC;
-- Extra: Using where; Using filesort

-- Fix: composite index with equality column first, sort column second
CREATE INDEX idx_author_published ON articles(author_id, published_at DESC);

EXPLAIN SELECT id, title FROM articles
WHERE author_id = 10
ORDER BY published_at DESC;
-- Extra: Using index condition (filesort gone)
```

The key rule: equality conditions in WHERE must precede sort columns in the index.

## Pattern 3: Range Filter Breaks Sort Optimization

A range condition in WHERE stops MySQL from using the remaining index columns for sorting:

```sql
CREATE INDEX idx_price_date ON products(price, created_at);

-- Equality filter: sort can use the index
EXPLAIN SELECT * FROM products WHERE price = 100 ORDER BY created_at;
-- Extra: Using index condition (good)

-- Range filter: sort cannot use index columns after the range
EXPLAIN SELECT * FROM products WHERE price > 50 ORDER BY created_at;
-- Extra: Using index condition; Using filesort (filesort returns)
```

For range + sort patterns, consider whether the sort can be avoided or the range can be narrowed enough that filesort is acceptable.

## Pattern 4: Mixed Sort Directions (MySQL 8.0)

```sql
-- Mixed ASC/DESC causes filesort in MySQL 5.7
EXPLAIN SELECT * FROM orders ORDER BY customer_id ASC, created_at DESC;
-- Extra: Using filesort

-- MySQL 8.0: create index matching mixed directions
CREATE INDEX idx_cust_date ON orders(customer_id ASC, created_at DESC);

EXPLAIN SELECT * FROM orders ORDER BY customer_id ASC, created_at DESC;
-- Extra: no "Using filesort" (filesort eliminated in MySQL 8.0+)
```

## Pattern 5: Covering Index Eliminates Both Scan and Filesort

```sql
-- A covering index that includes all SELECT, WHERE, and ORDER BY columns
CREATE INDEX idx_covering ON articles(author_id, published_at DESC, id, title);

EXPLAIN SELECT id, title FROM articles
WHERE author_id = 10
ORDER BY published_at DESC;
-- Extra: Using index (no table access, no filesort)
```

## Monitoring Filesort Activity

```sql
-- Track how often filesort happens
SHOW GLOBAL STATUS LIKE 'Sort_scan';
SHOW GLOBAL STATUS LIKE 'Sort_range';

-- Track disk spills (very bad)
SHOW GLOBAL STATUS LIKE 'Sort_merge_passes';
-- Non-zero means sorts are spilling to disk - increase sort_buffer_size
```

## Summary

Avoiding filesort in MySQL requires aligning your indexes with your ORDER BY clauses. Put WHERE equality columns first in a composite index, followed by the sort columns in the correct direction. MySQL 8.0 adds native support for descending indexes, eliminating filesort for mixed-direction sorts. Use EXPLAIN to confirm `Using filesort` is absent after index changes, and monitor `Sort_merge_passes` to detect disk-spilling sorts in production.
