# How to Build Top/Bottom Performer Reports in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Top Performer, Ranking, Window Function, Analytics

Description: Learn how to build top and bottom performer reports in ClickHouse using rank, dense_rank, and topK aggregate functions for leaderboard analysis.

---

## Top/Bottom Performer Reports

Leaderboard reports identify the best and worst performing entities - top products by revenue, slowest API endpoints, highest-spending customers. ClickHouse provides `topK`, window functions like `rank()`, and `LIMIT` with `ORDER BY` for all these patterns.

## Sample Sales Data

```sql
CREATE TABLE product_sales
(
    sale_date Date,
    product_id UInt32,
    product_name String,
    category String,
    revenue Float64,
    units_sold UInt32
)
ENGINE = MergeTree()
ORDER BY (sale_date, product_id);
```

## Simple Top N with ORDER BY

```sql
SELECT
    product_name,
    sum(revenue) AS total_revenue,
    sum(units_sold) AS total_units
FROM product_sales
WHERE sale_date >= today() - 30
GROUP BY product_name
ORDER BY total_revenue DESC
LIMIT 10;
```

## Top N per Category

Use window functions to rank within each category:

```sql
SELECT product_name, category, total_revenue, rank_in_category
FROM (
    SELECT
        product_name,
        category,
        sum(revenue) AS total_revenue,
        rank() OVER (PARTITION BY category ORDER BY sum(revenue) DESC) AS rank_in_category
    FROM product_sales
    GROUP BY product_name, category
)
WHERE rank_in_category <= 3
ORDER BY category, rank_in_category;
```

## Bottom N Performers

```sql
SELECT
    product_name,
    sum(revenue) AS total_revenue,
    sum(units_sold) AS total_units,
    avg(revenue / units_sold) AS avg_unit_price
FROM product_sales
WHERE sale_date >= today() - 30
GROUP BY product_name
ORDER BY total_revenue ASC
LIMIT 10;
```

## Using topK for Most Frequent Values

`topK` returns the approximately most frequent values in a column, not the top values by a metric. It is useful for finding which products appear most often in sales records:

```sql
SELECT topK(10)(product_name) AS most_frequent_products
FROM product_sales;
```

## Percentile Rank

Show where each product ranks relative to all products:

```sql
SELECT
    product_name,
    sum(revenue) AS revenue,
    round(
        percent_rank() OVER (ORDER BY sum(revenue)),
        4
    ) AS percentile_rank
FROM product_sales
GROUP BY product_name
ORDER BY revenue DESC;
```

## Combined Top and Bottom

Show both extremes in one query using UNION ALL:

```sql
SELECT 'Top 5' AS category, product_name, total_revenue
FROM (
    SELECT product_name, sum(revenue) AS total_revenue
    FROM product_sales GROUP BY product_name
    ORDER BY total_revenue DESC LIMIT 5
)
UNION ALL
SELECT 'Bottom 5', product_name, total_revenue
FROM (
    SELECT product_name, sum(revenue) AS total_revenue
    FROM product_sales GROUP BY product_name
    ORDER BY total_revenue ASC LIMIT 5
)
ORDER BY category, total_revenue DESC;
```

## Week-over-Week Rank Change

```sql
WITH this_week AS (
    SELECT product_name, sum(revenue) AS rev,
        rank() OVER (ORDER BY sum(revenue) DESC) AS rnk
    FROM product_sales WHERE sale_date >= today() - 7
    GROUP BY product_name
),
last_week AS (
    SELECT product_name, sum(revenue) AS rev,
        rank() OVER (ORDER BY sum(revenue) DESC) AS rnk
    FROM product_sales WHERE sale_date BETWEEN today() - 14 AND today() - 8
    GROUP BY product_name
)
SELECT t.product_name, t.rnk AS this_rank,
    l.rnk AS last_rank,
    l.rnk - t.rnk AS rank_improvement
FROM this_week t
LEFT JOIN last_week l ON t.product_name = l.product_name
ORDER BY t.rnk;
```

## Summary

ClickHouse top/bottom reports use `ORDER BY ... LIMIT` for simple cases, window `rank()` for per-group rankings, `percent_rank()` for relative positioning, and `topK` for approximate most-frequent-value queries. Combine with period CTEs to show rank movement over time.
