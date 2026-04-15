# How to Optimize JOIN Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Join, Query Optimization, Dictionary, Performance, Hash Join

Description: Learn how to optimize JOIN queries in ClickHouse using the right join algorithm, dictionaries, and query structure for best performance.

---

ClickHouse is not a traditional OLTP database - JOINs work best when you understand how it handles them internally. This guide covers the most effective strategies to optimize JOIN performance.

## Put the Smaller Table on the Right

ClickHouse loads the right-hand table into memory as a hash table. Always put the smaller table on the right:

```sql
-- Good: small dimension table on the right
SELECT e.event_type, u.country, count()
FROM events AS e
JOIN users AS u ON e.user_id = u.user_id
GROUP BY e.event_type, u.country;

-- Bad: large fact table on the right (huge memory usage)
SELECT e.event_type, u.country, count()
FROM users AS u
JOIN events AS e ON u.user_id = e.user_id
GROUP BY e.event_type, u.country;
```

## Use Dictionaries Instead of JOINs

For dimension lookups, dictionaries are significantly faster than JOIN because the data is loaded into memory once and accessed via function calls:

```sql
CREATE DICTIONARY user_country_dict (
    user_id UInt64,
    country String
)
PRIMARY KEY user_id
SOURCE(CLICKHOUSE(TABLE 'users'))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);
```

```sql
-- Dictionary lookup instead of JOIN
SELECT event_type, dictGet('user_country_dict', 'country', user_id) AS country, count()
FROM events
GROUP BY event_type, country;
```

## Choose the Right Join Algorithm

```sql
SET join_algorithm = 'hash';           -- good for small right tables
SET join_algorithm = 'parallel_hash';  -- default since v24.11, parallelized hash join
SET join_algorithm = 'partial_merge'; -- lower memory, good for sorted data
SET join_algorithm = 'grace_hash';   -- spills to disk, for large joins
```

For very large joins that exceed memory:

```sql
SET join_algorithm = 'grace_hash';
SET grace_hash_join_initial_buckets = 16;
```

## Use ANY JOIN to Avoid Deduplication

If you only need one matching row from the right side, `ANY JOIN` is faster than the default `ALL JOIN`:

```sql
SELECT e.event_id, u.country
FROM events AS e
ANY LEFT JOIN users AS u ON e.user_id = u.user_id;
```

## Filter Before Joining

Push predicates into subqueries to reduce the data size before the join:

```sql
SELECT e.event_type, u.country, count()
FROM (
    SELECT event_type, user_id FROM events WHERE event_time >= today() - 7
) AS e
JOIN (
    SELECT user_id, country FROM users WHERE active = 1
) AS u ON e.user_id = u.user_id
GROUP BY e.event_type, u.country;
```

## Avoid Non-Equi Joins

Range joins and inequality conditions force ClickHouse to do nested-loop evaluation. Restructure queries to use equi-joins where possible. For time-range conditions, consider using `ASOF JOIN` which efficiently matches on the closest value:

```sql
SELECT e.event_id, p.price
FROM events AS e
ASOF LEFT JOIN prices AS p ON e.product_id = p.product_id AND e.event_time >= p.valid_from;
```

## Summary

JOIN optimization in ClickHouse centers on keeping the right table small, using dictionaries for repeated dimension lookups, selecting an appropriate join algorithm, and filtering aggressively before the join. For large-scale joins, `grace_hash` with disk spilling prevents out-of-memory failures while maintaining correctness.
