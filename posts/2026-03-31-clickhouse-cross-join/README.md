# How to Use CROSS JOIN in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, CROSS JOIN, Cartesian Product

Description: Learn how to use CROSS JOIN in ClickHouse to produce a Cartesian product, including syntax, valid use cases, and performance considerations.

---

A `CROSS JOIN` produces the Cartesian product of two tables - every row from the left table is paired with every row from the right table. If the left table has M rows and the right table has N rows, the result has M x N rows. In ClickHouse, `CROSS JOIN` is most useful for combining small lookup or dimension tables against a larger dataset, generating parameter grids, or pairing aggregated scalars with detail rows.

## Basic CROSS JOIN Syntax

```sql
SELECT
    products.product_name,
    regions.region_name
FROM products
CROSS JOIN regions
ORDER BY products.product_name, regions.region_name;
```

This query pairs every product with every region. If `products` has 100 rows and `regions` has 10, the result has 1,000 rows.

## CROSS JOIN with a Scalar Subquery

The most common production use of `CROSS JOIN` in ClickHouse is pairing a scalar (single-row) aggregate with a detail table - effectively broadcasting a computed value to every row.

```sql
WITH global_avg AS (
    SELECT avg(response_time_ms) AS avg_rt
    FROM http_logs
    WHERE event_time >= now() - INTERVAL 1 HOUR
)
SELECT
    l.endpoint,
    l.response_time_ms,
    ga.avg_rt,
    l.response_time_ms - ga.avg_rt AS delta
FROM http_logs AS l
CROSS JOIN global_avg AS ga
WHERE l.event_time >= now() - INTERVAL 1 HOUR
ORDER BY delta DESC
LIMIT 100;
```

## Generating a Parameter Grid

`CROSS JOIN` is useful for expanding combinations of parameter values, for example when testing all combinations of experiment variants:

```sql
SELECT
    v.variant,
    m.metric
FROM
    (SELECT 'control' AS variant UNION ALL SELECT 'treatment_a' UNION ALL SELECT 'treatment_b') AS v
    CROSS JOIN
    (SELECT 'clicks' AS metric UNION ALL SELECT 'conversions' UNION ALL SELECT 'revenue') AS m
ORDER BY v.variant, m.metric;
```

## Implicit CROSS JOIN (Comma Syntax)

ClickHouse also supports the implicit Cartesian product using a comma between table names in the `FROM` clause. This is equivalent to `CROSS JOIN` but less explicit:

```sql
-- These two are equivalent
SELECT a.x, b.y FROM table_a AS a CROSS JOIN table_b AS b;
SELECT a.x, b.y FROM table_a AS a, table_b AS b;
```

Prefer the explicit `CROSS JOIN` keyword for clarity.

## Applying a Filter After CROSS JOIN

If you include a `WHERE` clause referencing columns from both tables, ClickHouse effectively turns the `CROSS JOIN` into an `INNER JOIN`. It is more efficient to write it as an explicit `INNER JOIN` in that case:

```sql
-- Avoid: CROSS JOIN with a filter is an implicit INNER JOIN
SELECT a.id, b.value
FROM table_a AS a
CROSS JOIN table_b AS b
WHERE a.key = b.key;

-- Better: explicit INNER JOIN
SELECT a.id, b.value
FROM table_a AS a
INNER JOIN table_b AS b ON a.key = b.key;
```

## Performance Warning

`CROSS JOIN` with two large tables will produce an enormous intermediate result and consume large amounts of memory. Always verify row counts before running a `CROSS JOIN`.

```sql
-- Check sizes before running the join
SELECT count() FROM table_a;  -- e.g., 1,000,000
SELECT count() FROM table_b;  -- e.g., 1,000,000
-- CROSS JOIN would produce 1,000,000,000,000 rows - do not do this
```

Restrict `CROSS JOIN` to cases where at least one side is small (typically under a few thousand rows) or is a single-row scalar subquery.

## Real-World Example - Daily Metric Baseline

```sql
WITH
    date_range AS (
        SELECT arrayJoin(
            arrayMap(x -> addDays(toDate('2024-01-01'), x), range(30))
        ) AS day
    ),
    services AS (
        SELECT DISTINCT service_name
        FROM metrics
    )
SELECT
    d.day,
    s.service_name,
    0 AS placeholder_value
FROM date_range AS d
CROSS JOIN services AS s
ORDER BY d.day, s.service_name;
-- Generates a full date x service grid so missing days appear as 0
```

## Summary

`CROSS JOIN` in ClickHouse produces the Cartesian product of two tables and is most safely used when one side is a small dimension table or a single-row scalar aggregate. Applying a `WHERE` filter that references both sides of a `CROSS JOIN` is equivalent to an `INNER JOIN` and should be written as such for clarity and performance. Never use `CROSS JOIN` between two large tables without a subsequent filter, as the result set grows as the product of both row counts.
