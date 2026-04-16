# How to Use GROUP BY ALL in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, GROUP BY ALL, Aggregation

Description: Use GROUP BY ALL in ClickHouse to automatically group by every non-aggregate column in the SELECT list, reducing repetition and maintenance overhead.

---

Writing a `GROUP BY` clause that mirrors the non-aggregate columns in your `SELECT` list is repetitive and easy to break when you add or rename columns. ClickHouse's `GROUP BY ALL` eliminates that boilerplate: it inspects the `SELECT` expressions and automatically groups by every column that is not wrapped in an aggregate function. The result is more concise queries that stay in sync with the `SELECT` list as it evolves.

## Basic Syntax

```sql
SELECT
    col1,
    col2,
    aggregate_function(col3) AS metric
FROM table_name
GROUP BY ALL;
```

ClickHouse identifies `col1` and `col2` as non-aggregate and uses them as the grouping key automatically.

## Simple Example

Compare the explicit and `GROUP BY ALL` forms side by side:

```sql
-- Explicit GROUP BY
SELECT
    country,
    product_category,
    count()      AS orders,
    sum(revenue) AS revenue
FROM sales
GROUP BY country, product_category;

-- Equivalent with GROUP BY ALL
SELECT
    country,
    product_category,
    count()      AS orders,
    sum(revenue) AS revenue
FROM sales
GROUP BY ALL;
```

Both produce identical results. `GROUP BY ALL` infers `country` and `product_category` because they are not wrapped in aggregate functions.

## Adding Columns Without Updating GROUP BY

The main practical benefit is that adding a new dimension to the `SELECT` list does not require a corresponding change to `GROUP BY`:

```sql
-- Before: three dimensions
SELECT
    year,
    quarter,
    region,
    sum(revenue) AS revenue
FROM sales
GROUP BY ALL;

-- After: just add the new column - GROUP BY ALL picks it up
SELECT
    year,
    quarter,
    region,
    channel,        -- new dimension, no GROUP BY change needed
    sum(revenue) AS revenue
FROM sales
GROUP BY ALL;
```

## How ClickHouse Determines Grouping Columns

ClickHouse applies the following rule: any top-level `SELECT` expression that is not an aggregate function (or does not contain one) is treated as a grouping key. Aliases are resolved before the check:

```sql
-- toString(ts) is not an aggregate, so it becomes part of the GROUP BY key
SELECT
    toString(toStartOfDay(ts)) AS day,
    status_code,
    count()                    AS requests
FROM access_logs
GROUP BY ALL;
-- Equivalent to: GROUP BY toString(toStartOfDay(ts)), status_code
```

## Comparison with Explicit GROUP BY

```sql
-- The two queries below are identical in semantics

-- Explicit
SELECT
    toYear(order_date)  AS year,
    customer_country,
    product_line,
    sum(units_sold)     AS units,
    avg(unit_price)     AS avg_price
FROM orders
GROUP BY toYear(order_date), customer_country, product_line;

-- GROUP BY ALL
SELECT
    toYear(order_date)  AS year,
    customer_country,
    product_line,
    sum(units_sold)     AS units,
    avg(unit_price)     AS avg_price
FROM orders
GROUP BY ALL;
```

## Limitations and Edge Cases

`GROUP BY ALL` does not work well in every situation. Watch out for:

```sql
-- Edge case: column used both inside and outside an aggregate
SELECT
    status,
    max(status),     -- aggregate over status
    count()
FROM events
GROUP BY ALL;
-- ClickHouse sees 'status' as non-aggregate and includes it in the key,
-- and max(status) aggregates over it - valid, though max(status) is
-- redundant because 'status' is constant within each group.

-- Subquery with GROUP BY ALL
SELECT
    category,
    total_revenue
FROM (
    SELECT
        category,
        sum(revenue) AS total_revenue
    FROM sales
    GROUP BY ALL
)
ORDER BY total_revenue DESC;
```

`GROUP BY ALL` resolves columns based on the outer `SELECT` list only - it does not look through CTEs or subqueries differently from an explicit `GROUP BY`.

## Practical Use in Analytical Queries

```sql
-- Wide aggregation with many dimension columns - GROUP BY ALL keeps it readable
SELECT
    toYear(ts)                      AS year,
    toMonth(ts)                     AS month,
    datacenter,
    service,
    http_method,
    status_code,
    count()                         AS requests,
    quantile(0.99)(duration_ms)     AS p99_ms,
    avg(duration_ms)                AS avg_ms,
    sum(bytes_sent)                 AS total_bytes
FROM http_logs
WHERE ts >= '2025-01-01'
GROUP BY ALL
ORDER BY year, month, datacenter, service;
```

## Summary

`GROUP BY ALL` is a convenience shorthand that groups by every non-aggregate expression in the `SELECT` list. It keeps queries concise, reduces the risk of `GROUP BY` mismatches when columns are added or renamed, and is semantically identical to listing those columns explicitly. It is best suited for exploratory queries and dashboards with many dimension columns; explicit `GROUP BY` remains clearer when the grouping key is important to highlight or differs from the `SELECT` list.
