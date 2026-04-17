# How to Build Drill-Down Reports in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Drill-Down, Report, ROLLUP, Analytics

Description: Learn how to build drill-down reports in ClickHouse using ROLLUP, CUBE, and parameterized queries to explore data from summary to detail.

---

## Drill-Down Reporting Concepts

Drill-down reports let users move from high-level summaries to detailed breakdowns - for example from total revenue to region, then product, then individual order. ClickHouse supports this through `WITH ROLLUP`, `WITH CUBE`, and layered query patterns.

## Sample Data Setup

```sql
CREATE TABLE orders
(
    order_date Date,
    region String,
    category String,
    product String,
    revenue Float64
)
ENGINE = MergeTree()
ORDER BY (order_date, region, category);

INSERT INTO orders VALUES
('2024-01-01', 'North', 'Electronics', 'Laptop', 1200),
('2024-01-01', 'North', 'Electronics', 'Phone', 800),
('2024-01-01', 'South', 'Furniture', 'Chair', 300),
('2024-01-02', 'South', 'Electronics', 'Tablet', 600),
('2024-01-02', 'East', 'Furniture', 'Desk', 500);
```

## Level 1 - Summary by Region

```sql
SELECT
    region,
    count() AS orders,
    sum(revenue) AS total_revenue
FROM orders
GROUP BY region
ORDER BY total_revenue DESC;
```

## Level 2 - Drill Down to Category within Region

```sql
SELECT
    region,
    category,
    count() AS orders,
    sum(revenue) AS total_revenue
FROM orders
WHERE region = 'North'
GROUP BY region, category
ORDER BY total_revenue DESC;
```

## Level 3 - Product Detail

```sql
SELECT
    product,
    count() AS orders,
    sum(revenue) AS revenue,
    avg(revenue) AS avg_order_value
FROM orders
WHERE region = 'North' AND category = 'Electronics'
GROUP BY product
ORDER BY revenue DESC;
```

## Using WITH ROLLUP for All Levels at Once

`WITH ROLLUP` generates subtotals for every prefix of the GROUP BY list:

```sql
SELECT
    region,
    category,
    product,
    sum(revenue) AS revenue,
    count() AS orders
FROM orders
GROUP BY region, category, product
WITH ROLLUP
ORDER BY region, category, product;
```

In subtotal rows ClickHouse fills the rolled-up key columns with their default values (empty string `''` for `String`, `0` for numeric types), not `NULL` - so rows with an empty `category` are region subtotals, and rows with an empty `region` are the grand total. To get actual `NULL` markers you would need the grouping columns to be declared `Nullable(...)`.

## Identifying Subtotal Rows with GROUPING

ClickHouse's `GROUPING()` aggregate function returns `1` for a column that has been rolled up in the current row and `0` for a detail value, which is the reliable way to label subtotal rows:

```sql
SELECT
    if(GROUPING(region) = 0, region, 'ALL') AS region,
    if(GROUPING(category) = 0, category, 'ALL') AS category,
    sum(revenue) AS revenue
FROM orders
GROUP BY region, category
WITH ROLLUP
ORDER BY region, category;
```

## Parameterized Drill-Down Pattern

Use a WHERE clause to accept any combination of filters:

```sql
SELECT
    product,
    sum(revenue) AS revenue
FROM orders
WHERE
    ({region:String} = '' OR region = {region:String})
    AND ({category:String} = '' OR category = {category:String})
GROUP BY product
ORDER BY revenue DESC;
```

## Summary

ClickHouse drill-down reports are built by progressively narrowing WHERE clauses, or by using `WITH ROLLUP` to generate all aggregation levels in a single query. Combine `GROUPING()` to distinguish subtotal rows from detail rows programmatically.
