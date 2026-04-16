# How to Use JOINs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, Join, INNER JOIN, LEFT JOIN

Description: Learn INNER, LEFT, RIGHT, and FULL OUTER JOIN syntax in ClickHouse, including join algorithms, distributed join behavior, and performance tips.

---

JOINs combine rows from two or more tables based on a related column. ClickHouse supports the standard SQL join types - INNER, LEFT, RIGHT, and FULL OUTER - along with several join algorithms tuned for analytical workloads. Because ClickHouse is a columnar database designed for large-scale reads, understanding how joins are executed is as important as knowing their syntax.

## INNER JOIN

An `INNER JOIN` returns only rows that have matching values in both tables.

```sql
SELECT
    o.order_id,
    o.amount,
    u.name AS customer_name
FROM orders AS o
INNER JOIN users AS u ON o.user_id = u.user_id
WHERE o.status = 'completed'
ORDER BY o.order_id;
```

## LEFT JOIN

A `LEFT JOIN` returns all rows from the left table plus matching rows from the right table. Non-matching rows from the right table produce NULL values.

```sql
SELECT
    u.user_id,
    u.name,
    count(o.order_id) AS order_count
FROM users AS u
LEFT JOIN orders AS o ON u.user_id = o.user_id
GROUP BY u.user_id, u.name
ORDER BY order_count DESC;
```

## RIGHT JOIN

A `RIGHT JOIN` returns all rows from the right table plus matching rows from the left table. ClickHouse supports this, though it is often rewritten as a `LEFT JOIN` with swapped tables. In the default hash join algorithm, the right table drives the hash table build regardless of join direction, so put the smaller table on the right when possible.

```sql
SELECT
    o.order_id,
    u.name AS customer_name
FROM orders AS o
RIGHT JOIN users AS u ON o.user_id = u.user_id;

-- Equivalent rewrite as a LEFT JOIN with swapped tables:
SELECT
    o.order_id,
    u.name AS customer_name
FROM users AS u
LEFT JOIN orders AS o ON u.user_id = o.user_id;
```

## FULL OUTER JOIN

A `FULL OUTER JOIN` returns all rows from both tables, with NULLs where there is no match on either side.

```sql
SELECT
    coalesce(a.user_id, b.user_id) AS user_id,
    a.name  AS name_in_users,
    b.email AS email_in_profiles
FROM users AS a
FULL OUTER JOIN profiles AS b ON a.user_id = b.user_id
WHERE a.user_id IS NULL OR b.user_id IS NULL;
-- Rows that exist in only one table
```

## Joining on Multiple Columns

```sql
SELECT
    e.employee_id,
    d.department_name,
    e.role
FROM employees AS e
INNER JOIN department_roles AS d
    ON e.department_id = d.department_id
    AND e.role = d.role;
```

## Join Algorithms

ClickHouse exposes several join algorithms through the `join_algorithm` setting. Choosing the right one can significantly affect memory usage and query speed.

```sql
-- Hash join (default): builds a hash table from the right table in memory
SET join_algorithm = 'hash';

SELECT l.id, r.value
FROM left_table AS l
INNER JOIN right_table AS r ON l.id = r.id;

-- Parallel hash join: builds hash table in parallel across threads
SET join_algorithm = 'parallel_hash';

-- Grace hash join: spills to disk when right table does not fit in memory
SET join_algorithm = 'grace_hash';
SET grace_hash_join_initial_buckets = 16;

-- Merge join: sort-merge join, useful when both sides are pre-sorted
SET join_algorithm = 'full_sorting_merge';

-- Direct join: uses a Join engine table directly as a lookup
SET join_algorithm = 'direct';
```

## Using the JOIN Engine for Repeated Lookups

When the right side is a small dimension table queried repeatedly, store it in a `Join` engine table for O(1) lookups:

```sql
CREATE TABLE country_lookup
(
    country_code FixedString(2),
    country_name String
)
ENGINE = Join(ANY, LEFT, country_code);

INSERT INTO country_lookup VALUES ('US', 'United States'), ('DE', 'Germany');

SELECT
    event_id,
    joinGet('country_lookup', 'country_name', country_code) AS country
FROM events;
```

## Performance Tips

Keep the right-side table small - it is loaded into memory for the hash table. Filter early with `WHERE` before the join, and prefer `INNER JOIN` when NULLs are not needed since it allows ClickHouse to discard non-matching rows sooner.

```sql
-- Push filters before the join using a subquery or CTE
WITH filtered_orders AS (
    SELECT order_id, user_id, amount
    FROM orders
    WHERE status = 'completed'
      AND order_date >= '2024-01-01'
)
SELECT
    fo.order_id,
    u.name,
    fo.amount
FROM filtered_orders AS fo
INNER JOIN users AS u ON fo.user_id = u.user_id;
```

## Summary

ClickHouse supports INNER, LEFT, RIGHT, and FULL OUTER JOIN with standard SQL syntax. The default hash join algorithm builds a hash table from the right table in memory, so keeping the right side small is a key performance consideration. For repeated small-table lookups, the `Join` engine with `joinGet()` avoids rebuilding the hash table on every query. Use `SET join_algorithm` to switch between hash, parallel hash, grace hash, and merge join algorithms based on table size and memory constraints.
