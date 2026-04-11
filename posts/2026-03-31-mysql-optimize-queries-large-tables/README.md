# How to Optimize Queries on Large Tables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Performance, Index, Optimization

Description: Learn strategies for optimizing MySQL queries on tables with millions of rows, including indexing, partitioning, covering indexes, and pagination techniques.

---

## What Makes Large Tables Different

Query optimization principles are the same for any table size, but large tables (tens of millions of rows) amplify the cost of every inefficiency. A full table scan that takes 10ms on a 10,000-row table takes 10 seconds on a 10-million-row table. Proper optimization is not optional at scale.

## Verify the Table Size

```sql
SELECT
  table_name,
  ROUND(data_length / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  table_rows
FROM information_schema.tables
WHERE table_schema = 'mydb' AND table_name = 'orders';
```

## EXPLAIN First, Always

On large tables, running a bad query without checking EXPLAIN first can lock the server:

```sql
-- Always EXPLAIN before running unknown queries on large tables
EXPLAIN SELECT customer_id, SUM(total) FROM orders
WHERE created_at > '2025-01-01'
GROUP BY customer_id;
```

Look for `rows` values in the millions and `Extra: Using temporary; Using filesort` as immediate warning signs.

## Use Selective Indexes

On a 50-million-row table, an index on a low-cardinality column (e.g., `status` with 3 values) may not help because MySQL reads a third of the table anyway. Index high-cardinality columns:

```sql
-- High cardinality: good index candidate
CREATE INDEX idx_customer_id ON orders(customer_id);

-- Low cardinality on its own: poor selectivity
-- CREATE INDEX idx_status ON orders(status);  -- often not helpful alone

-- Low cardinality as part of composite: useful
CREATE INDEX idx_status_created ON orders(status, created_at);
```

## Covering Indexes for Read-Heavy Queries

On large tables, eliminating table row lookups by using a covering index dramatically reduces I/O:

```sql
-- Frequently run report query
SELECT customer_id, status, total FROM orders
WHERE created_at > '2025-01-01' AND status = 'completed';

-- Covering index includes all referenced columns
CREATE INDEX idx_covering ON orders(status, created_at, customer_id, total);

EXPLAIN SELECT customer_id, status, total FROM orders
WHERE created_at > '2025-01-01' AND status = 'completed';
-- Extra: Using index (no row lookup - very fast even on large table)
```

## Use Keyset Pagination Instead of LIMIT OFFSET

`LIMIT X OFFSET Y` forces MySQL to scan Y rows before returning X. At large offsets on large tables, this is extremely slow:

```sql
-- Slow: MySQL scans 500,000 rows to skip them
SELECT id, name FROM products ORDER BY id LIMIT 20 OFFSET 500000;

-- Fast: use the last ID from the previous page
SELECT id, name FROM products WHERE id > 500000 ORDER BY id LIMIT 20;
```

## Partition Large Tables by Date

For time-series tables that grow continuously, partitioning enables partition pruning - MySQL only reads relevant partitions:

```sql
-- Create partitioned table
CREATE TABLE events (
  id BIGINT AUTO_INCREMENT,
  event_type VARCHAR(100),
  created_at DATE NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p2024 VALUES LESS THAN ('2025-01-01'),
  PARTITION p2025_h1 VALUES LESS THAN ('2025-07-01'),
  PARTITION p2025_h2 VALUES LESS THAN ('2026-01-01'),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Query only scans relevant partition
EXPLAIN SELECT * FROM events WHERE created_at BETWEEN '2025-01-01' AND '2025-06-30';
-- partitions: p2025_h1
```

## Keep Statistics Current

On large tables, the optimizer relies heavily on statistics to choose plans. Stale statistics lead to poor choices:

```sql
-- Update table statistics
ANALYZE TABLE orders;

-- Check when InnoDB statistics were last updated
SELECT last_update FROM mysql.innodb_table_stats
WHERE database_name = 'mydb' AND table_name = 'orders';
```

## Summary

Optimizing queries on large MySQL tables requires careful index design with high-cardinality columns, covering indexes to eliminate row lookups, and keyset pagination instead of LIMIT OFFSET for deep paging. For tables that grow continuously, partitioning reduces scan scope dramatically. Always run EXPLAIN before executing unknown queries on large tables - a single full scan on a 100-million-row table can cause a server outage.
