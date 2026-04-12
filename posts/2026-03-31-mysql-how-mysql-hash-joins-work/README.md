# How MySQL Hash Joins Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Hash Join, Query Optimization, Performance, Internal

Description: Learn how MySQL 8's hash join algorithm works, when the optimizer chooses it over nested loop joins, and how to tune it for large datasets.

---

## What Are Hash Joins in MySQL

MySQL 8.0.18 introduced the hash join algorithm as an alternative to the classic nested loop join. Hash joins are used when no usable index exists for a join condition, making them superior to nested loops for large unindexed joins.

Hash joins use two phases:
1. **Build phase** - scan the smaller table (build input) and build an in-memory hash table on the join key.
2. **Probe phase** - scan the larger table (probe input) and probe the hash table to find matching rows.

## When MySQL Uses Hash Joins

MySQL's optimizer chooses hash joins when:
- The join columns have no index on one or both sides.
- The estimated cost of a hash join is lower than a nested loop join.
- The join is an equi-join (`=`), since hash joins only work on equality conditions.

MySQL 8.0.20 extended hash joins to work in more scenarios, including non-equi-join conditions, outer joins, semi-joins, and anti-joins.

## Verifying Hash Join Usage with EXPLAIN

```sql
EXPLAIN FORMAT=TREE
SELECT o.id, c.name, o.total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date > '2025-01-01';
```

Output when hash join is used:

```text
-> Inner hash join (c.id = o.customer_id)
    -> Table scan on c
    -> Filter: (o.order_date > '2025-01-01')
        -> Table scan on o
```

With `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

## Build and Probe Table Selection

MySQL automatically picks the smaller table as the build input. The build table is hashed entirely into memory. If it does not fit, MySQL uses an on-disk spill strategy (chunk files).

## Memory for Hash Joins

Hash join memory is controlled by `join_buffer_size`:

```sql
SHOW VARIABLES LIKE 'join_buffer_size';
-- Default: 262144 (256KB)

SET SESSION join_buffer_size = 33554432;  -- 32MB for this session
```

In `my.cnf`:

```text
[mysqld]
join_buffer_size = 32M
```

If the build table exceeds available memory, MySQL splits it into chunks and performs multiple passes, which is slower but still faster than an unindexed nested loop.

## Hash Join vs Nested Loop Join

```sql
-- STRAIGHT_JOIN forces table join order, not the join algorithm
EXPLAIN SELECT STRAIGHT_JOIN o.id, c.name
FROM customers c
JOIN orders o ON o.customer_id = c.id;

-- Let MySQL use hash join (no index on customer_id)
EXPLAIN SELECT o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

For large tables without indexes on join columns, hash join can be 10-100x faster than nested loops.

## Disabling Hash Joins

To compare performance with and without hash joins:

```sql
-- MySQL 8.0.18 only: disable hash join using the hash_join flag
SET SESSION optimizer_switch = 'hash_join=off';

-- MySQL 8.0.19+: the hash_join flag has no effect; use block_nested_loop instead
SET SESSION optimizer_switch = 'block_nested_loop=off';

-- Re-enable
SET SESSION optimizer_switch = 'block_nested_loop=on';
```

## Hash Join Limitations

- In MySQL 8.0.18, only equi-joins (`=`) can use hash joins. From MySQL 8.0.20 onward, hash joins also support non-equi-join conditions (`>`, `<`, `<>`, etc.), though these are applied as a filter after the join.
- Hash joins do not use indexes, so adding an appropriate index will often make an index-based nested loop faster for selective queries.

## Practical Example - Joining Without an Index

```sql
-- Scenario: no index on orders.customer_email
CREATE TABLE orders2 (
  id INT PRIMARY KEY,
  customer_email VARCHAR(200),
  amount DECIMAL(10,2)
);

CREATE TABLE customers2 (
  id INT PRIMARY KEY,
  email VARCHAR(200),
  name VARCHAR(100)
);

EXPLAIN FORMAT=TREE
SELECT o.id, c.name, o.amount
FROM orders2 o
JOIN customers2 c ON o.customer_email = c.email;
```

MySQL will use a hash join since `customer_email` has no index. To improve performance further, add an index:

```sql
ALTER TABLE orders2 ADD INDEX idx_customer_email (customer_email);
ALTER TABLE customers2 ADD INDEX idx_email (email);
```

After adding indexes, MySQL will switch back to a nested loop join with index access.

## Summary

Hash joins in MySQL 8 provide an efficient alternative to nested loop joins when join columns lack indexes. MySQL builds an in-memory hash table from the smaller table and probes it with each row from the larger table. Tune `join_buffer_size` to ensure the build table fits in memory, and use `EXPLAIN ANALYZE FORMAT=TREE` to verify the optimizer is choosing hash joins for your large unindexed joins.
