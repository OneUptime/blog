# How to Create Covering Indexes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Covering Index, Query Optimization, Performance

Description: Learn how to create covering indexes in MySQL so queries can be satisfied entirely from the index without reading the actual table rows.

---

## Overview

A covering index is an index that contains all the columns a query needs - both the filter columns and the select columns. When MySQL can satisfy an entire query from the index alone, it never needs to read the actual table rows. This is called an "index-only scan" and is significantly faster than a regular index lookup that requires fetching row data.

You can identify a covering index in `EXPLAIN` output by the phrase `Using index` in the `Extra` column.

## How Covering Indexes Work

A regular index lookup has two steps:
1. Traverse the index to find matching row pointers
2. Follow each pointer to read the actual row from the table (random I/O)

A covering index satisfies the query in step 1 alone, eliminating the expensive step 2.

## Creating a Covering Index

Suppose you frequently run this query:

```sql
SELECT user_id, status, created_at
FROM orders
WHERE user_id = 42;
```

A covering index includes all three columns:

```sql
CREATE INDEX idx_covering_orders ON orders (user_id, status, created_at);
```

Now MySQL can return `user_id`, `status`, and `created_at` directly from the index without touching the table data.

## Verifying with EXPLAIN

```sql
EXPLAIN SELECT user_id, status, created_at FROM orders WHERE user_id = 42\G
```

```text
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: orders
         type: ref
possible_keys: idx_covering_orders
          key: idx_covering_orders
      key_len: 4
          ref: const
         rows: 15
        Extra: Using index
```

The `Using index` in `Extra` confirms this is an index-only scan.

## Practical Example: Reporting Query

A common use case is pagination or reporting queries:

```sql
-- Frequent reporting query
SELECT order_id, customer_id, total, status
FROM orders
WHERE status = 'shipped' AND created_at >= '2025-01-01'
ORDER BY created_at DESC;
```

Create a covering index that includes all referenced columns:

```sql
CREATE INDEX idx_cov_status_date_id_cust_total
  ON orders (status, created_at, order_id, customer_id, total);
```

Column order: filter columns first (`status`, `created_at`), then selected-only columns (`order_id`, `customer_id`, `total`).

## Rules for Designing Covering Indexes

1. Put `WHERE` clause columns first (most selective first)
2. Add `ORDER BY` columns next
3. Add `SELECT` columns last
4. Only include columns used by the specific query

```sql
-- Query pattern:
-- WHERE user_id = ? AND status = ?
-- ORDER BY created_at DESC
-- SELECT id, total

CREATE INDEX idx_cov ON orders (user_id, status, created_at, id, total);
```

## When Covering Indexes Are Not Possible

If `SELECT *` is used, a covering index is rarely practical because it would need to include every column. Covering indexes work best for queries with a limited, known set of output columns:

```sql
-- Covering index is NOT useful here - too many columns needed
SELECT * FROM orders WHERE user_id = 42;

-- Covering index IS useful here
SELECT id, status, total FROM orders WHERE user_id = 42;
```

## Checking Index Size

Covering indexes can become wide. Check their impact:

```sql
SELECT index_name, stat_value AS pages
FROM mysql.innodb_index_stats
WHERE table_name = 'orders' AND stat_name = 'size'
ORDER BY stat_value DESC;
```

## Covering Index for COUNT Queries

Covering indexes also help `COUNT` queries:

```sql
-- Without covering index: full table scan
SELECT COUNT(*) FROM orders WHERE user_id = 42;

-- With index on (user_id): index-only count
CREATE INDEX idx_user_id ON orders (user_id);
EXPLAIN SELECT COUNT(*) FROM orders WHERE user_id = 42;
-- Extra: Using index
```

## Summary

Covering indexes are the most efficient index type in MySQL because they eliminate the need to read actual table rows. Design them by placing filter columns first, followed by `ORDER BY` columns, then `SELECT` columns. Verify they are working with `EXPLAIN` by looking for `Using index` in the `Extra` column. They are most beneficial for high-frequency queries on large tables where the selected column set is small and predictable.
