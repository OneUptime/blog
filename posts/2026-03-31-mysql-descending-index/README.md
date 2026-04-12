# How to Create a Descending Index in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Performance, InnoDB, Query

Description: Learn how to create descending indexes in MySQL 8 to optimize ORDER BY DESC queries and mixed-order sorts without backward index scans.

---

## What Is a Descending Index?

Prior to MySQL 8.0, the `DESC` keyword in index definitions was accepted syntactically but ignored - all indexes were stored in ascending order. MySQL 8.0 introduced true descending indexes, where values are stored from highest to lowest. This allows the optimizer to satisfy `ORDER BY ... DESC` queries with a forward scan of the descending index, which is more efficient than a backward scan of an ascending index.

## Creating a Descending Index

```sql
CREATE TABLE events (
    id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    INDEX idx_date_desc (event_date DESC)
);
```

Or add one to an existing table:

```sql
ALTER TABLE events ADD INDEX idx_date_desc (event_date DESC);
```

## When Descending Indexes Are Most Useful

The clearest benefit is for queries that sort in descending order:

```sql
-- Benefits from idx_date_desc: forward scan, no filesort
SELECT id, name, event_date
FROM events
ORDER BY event_date DESC
LIMIT 10;
```

Without a descending index, MySQL would use a backward scan of the ascending index, which is slightly less cache-friendly.

## Mixed-Order Composite Indexes

The most compelling use case for descending indexes is mixed-order sorts in composite indexes:

```sql
-- Query: sort by category ASC, then by price DESC
SELECT id, category, price, name
FROM products
ORDER BY category ASC, price DESC
LIMIT 20;
```

Before MySQL 8.0, no index could satisfy this mixed-order sort - MySQL had to perform a filesort. In MySQL 8.0+, define the index to match the sort order:

```sql
CREATE INDEX idx_category_price ON products (category ASC, price DESC);
```

Now the query can use the index in a forward scan with no filesort.

## Verifying with EXPLAIN

```sql
EXPLAIN SELECT id, category, price
FROM products
ORDER BY category ASC, price DESC
LIMIT 20\G
```

```text
...
key: idx_category_price
Extra: Using index
...
```

`Using filesort` absent from `Extra` confirms the index satisfied the sort.

## Checking the Index Direction

```sql
SELECT INDEX_NAME, COLUMN_NAME, COLLATION
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'your_database'
  AND TABLE_NAME = 'products'
  AND INDEX_NAME = 'idx_category_price';
```

`COLLATION = 'A'` means ascending; `COLLATION = 'D'` means descending.

## Limitations

- Descending indexes are supported only for the InnoDB storage engine in MySQL 8.0+.
- Spatial and full-text indexes do not support the `DESC` option.
- HASH indexes (used by MEMORY tables) do not support direction.

## Summary

Descending indexes in MySQL 8 enable efficient forward scans for `ORDER BY DESC` queries and, more importantly, allow the optimizer to satisfy mixed ascending/descending sort orders in composite indexes without a filesort. Define the index column directions to match your most frequent `ORDER BY` clauses and verify the improvement with `EXPLAIN`.
