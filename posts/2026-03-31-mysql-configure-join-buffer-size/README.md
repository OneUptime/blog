# How to Configure join_buffer_size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Join, Buffer, Performance

Description: Configure MySQL join_buffer_size to improve full-scan join performance, understand when it is used, and balance memory usage against query speed.

---

## What Is join_buffer_size

`join_buffer_size` is the amount of memory allocated for join operations that cannot use an index. When MySQL performs a Block Nested Loop join (no index on the join column), it reads rows from the first table into a join buffer and then scans the second table once per buffer, rather than once per row.

A larger buffer means more rows from the driving table fit in memory, reducing the number of scans on the inner table.

## Check the Current Value

```sql
SHOW VARIABLES LIKE 'join_buffer_size';
```

```text
+------------------+--------+
| Variable_name    | Value  |
+------------------+--------+
| join_buffer_size | 262144 |
+------------------+--------+
```

Default is 256 KB.

## Detect When join_buffer_size Is Being Used

EXPLAIN will show when a join cannot use an index:

```sql
EXPLAIN SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'\G
```

```text
           type: ALL
  possible_keys: NULL
            key: NULL
           rows: 450000
           Extra: Using join buffer (Block Nested Loop)
```

`Using join buffer` means `join_buffer_size` affects this query.

## Increase join_buffer_size

```sql
SET GLOBAL join_buffer_size = 4194304;  -- 4 MB
```

In `my.cnf`:

```ini
[mysqld]
join_buffer_size = 4M
```

## Per-Session Override for Large Joins

```sql
SET SESSION join_buffer_size = 67108864;  -- 64 MB for this query
SELECT /*+ BNL(o, c) */ o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

## Fix Joins Properly with Indexes

Increasing `join_buffer_size` is a workaround. The root fix is to add the missing index:

```sql
-- Check which column lacks an index
EXPLAIN SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id\G

-- Add the missing index
ALTER TABLE orders ADD INDEX idx_customer_id (customer_id);

-- Verify the join now uses the index
EXPLAIN SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id\G
```

After adding the index, the join type should change from `ALL` to `ref` or `eq_ref`, and `Using join buffer` should disappear from `Extra`.

## Hash Join (MySQL 8.0.18+)

MySQL 8.0.18 introduced hash joins as a replacement for Block Nested Loop joins. Hash joins are faster and use memory more efficiently. The hash join build phase also respects `join_buffer_size`:

```sql
-- Verify hash join is being used
EXPLAIN FORMAT=JSON SELECT o.*, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

Look for `"using_join_buffer": "hash join"` in the output.

## Memory Considerations

Like `sort_buffer_size`, `join_buffer_size` is allocated **per join operation per connection**. A single complex query with multiple joins may allocate the buffer multiple times.

```sql
-- Check memory impact at current settings
SELECT @@join_buffer_size / 1024 / 1024 AS join_buffer_mb,
       @@max_connections AS max_conn,
       @@join_buffer_size * @@max_connections / 1024 / 1024 / 1024 AS worst_case_gb;
```

## Summary

`join_buffer_size` improves performance for joins that cannot use indexes (full-table-scan joins). Identify them in EXPLAIN output via `Using join buffer`. The best fix is adding a missing index to the join column. When indexes are not possible, increase `join_buffer_size` globally or per session, keeping in mind it is allocated per join operation and can multiply across concurrent connections.
