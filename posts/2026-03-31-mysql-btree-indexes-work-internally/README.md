# How MySQL B-Tree Indexes Work Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, B-Tree, InnoDB, Internal

Description: Learn how MySQL InnoDB B-Tree indexes are structured internally, how they support lookups and range scans, and how the clustered index differs from secondary indexes.

---

## The B-Tree Data Structure

MySQL InnoDB uses B+ Trees (a variant of B-Trees) for all indexes. In a B+ Tree:

- **Internal nodes** hold keys and pointers to child nodes.
- **Leaf nodes** hold the actual index entries (and, for the clustered index, the full row data).
- All leaf nodes are linked in a doubly-linked list, enabling efficient range scans.

The tree is balanced: all leaf nodes are at the same depth. Lookups traverse from root to leaf in O(log N) steps.

## The Clustered Index

InnoDB organizes table data around the primary key as a clustered index. The leaf nodes of the clustered index B-Tree contain the complete row data:

```sql
CREATE TABLE orders (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,  -- Clustered index key
  user_id    INT UNSIGNED NOT NULL,
  total      DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL
);
```

There is no separate row storage. The data is the index. A primary key lookup traverses the B-Tree to the leaf node and the row is found there:

```sql
EXPLAIN SELECT * FROM orders WHERE id = 42;
-- type = const, key = PRIMARY, rows = 1
-- One B-Tree traversal retrieves the full row
```

## Secondary Indexes

Secondary indexes have a separate B-Tree. Their leaf nodes contain the indexed column(s) plus the primary key value (not the full row):

```sql
CREATE INDEX idx_user_id ON orders (user_id);
```

A secondary index lookup involves two steps:
1. Traverse the `idx_user_id` B-Tree to find matching leaf entries containing `user_id` and `id`.
2. For each result, traverse the clustered index B-Tree to retrieve the full row (a "bookmark lookup").

```sql
EXPLAIN SELECT * FROM orders WHERE user_id = 42;
-- type = ref, key = idx_user_id
-- Each row requires a second lookup into the clustered index
```

## Covering Indexes Avoid Double Lookup

A covering index includes all columns the query needs, so the bookmark lookup is skipped entirely:

```sql
CREATE INDEX idx_user_total ON orders (user_id, total);

EXPLAIN SELECT user_id, total FROM orders WHERE user_id = 42;
-- Extra = Using index (no table row access needed)
```

## Range Scans Using Leaf Node Links

B+ Tree leaf nodes form a linked list. Once the B-Tree traversal locates the first matching leaf entry, a range scan follows the links sequentially without going back to the root:

```sql
EXPLAIN SELECT * FROM orders WHERE id BETWEEN 100 AND 200;
-- type = range, key = PRIMARY
-- Traverses to id=100, then follows leaf links to id=200
```

This is why range queries on indexed columns are efficient and why index ordering matters - data is physically sorted by the index key.

## Index Page Structure

Index data is stored in 16 KB pages (same as data pages). Each page holds as many key-pointer pairs as fit. MySQL tries to fill pages 15/16 full, leaving room for future inserts to avoid immediate page splits:

```sql
SHOW VARIABLES LIKE 'innodb_fill_factor';
-- Default: 100 (leaves 1/16 free in clustered index pages, ~93% fill)
```

For append-only tables (monotonically increasing primary keys), page splits are rare because new entries always go to the rightmost page. The default `innodb_fill_factor` of 100 is already optimal. For random-insert workloads, a lower fill factor can reduce page splits:

```sql
SET GLOBAL innodb_fill_factor = 80;  -- Reserve 20% of B-tree page space for future inserts
```

## Checking Index Usage

```sql
SELECT
  object_name  AS table_name,
  index_name,
  count_star   AS total_uses,
  count_read,
  count_write
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = 'myapp'
ORDER BY count_star DESC;
```

Indexes with zero `count_star` are unused and can be dropped.

## Summary

MySQL B-Tree indexes are B+ Trees where leaf nodes hold index entries linked for efficient range scans. The clustered index stores complete rows at its leaves, making primary key lookups single-tree traversals. Secondary indexes store primary key values at their leaves and require a second lookup into the clustered index unless a covering index is used. Index page fill and cardinality directly affect both storage efficiency and query performance.
