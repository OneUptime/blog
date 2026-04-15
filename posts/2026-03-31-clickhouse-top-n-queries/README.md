# How to Implement Top-N Queries Efficiently in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Top-N, TopK, Performance, Aggregation

Description: Learn how to implement efficient Top-N queries in ClickHouse using topK, ORDER BY LIMIT, and materialized views to find the most frequent or highest-value items.

---

## Top-N Queries

Top-N queries find the N highest or lowest values in a dataset: top 10 pages by traffic, top 5 products by revenue, most frequent errors. ClickHouse provides multiple mechanisms that trade accuracy for speed at different scales.

## Simple ORDER BY LIMIT

The most straightforward Top-N:

```sql
SELECT
    page_path,
    count() AS views,
    uniq(user_id) AS unique_visitors
FROM page_views
WHERE event_time >= today() - 7
GROUP BY page_path
ORDER BY views DESC
LIMIT 10;
```

## topK Approximate Function

For massive datasets where exact counts are too slow, `topK` uses the Filtered Space-Saving algorithm:

```sql
SELECT topK(10)(page_path) AS top_pages
FROM page_views
WHERE event_time >= today() - 7;
```

`topK` runs in O(k) memory regardless of cardinality, making it efficient for real-time leaderboards.

## topKWeighted

Weight items by a value column, not just frequency:

```sql
SELECT topKWeighted(10)(product_id, revenue) AS top_products_by_revenue
FROM orders
WHERE order_time >= today() - 7
  AND status = 'completed';
```

## Top-N Per Group

Find the top product per category:

```sql
SELECT
    category,
    product_id,
    total_revenue
FROM (
    SELECT
        category,
        product_id,
        sum(revenue) AS total_revenue,
        row_number() OVER (PARTITION BY category ORDER BY sum(revenue) DESC) AS rn
    FROM orders
    WHERE order_time >= today() - 7
    GROUP BY category, product_id
)
WHERE rn <= 3
ORDER BY category, total_revenue DESC;
```

## Materialized Top-N

For dashboards that query Top-N frequently, materialize it:

```sql
CREATE TABLE top_pages_daily
(
    day         Date,
    page_path   String,
    views       UInt64,
    rank        UInt16
)
ENGINE = MergeTree()
ORDER BY (day, rank);

-- Populate daily via scheduled job
INSERT INTO top_pages_daily
SELECT today() - 1 AS day, page_path, views, row_number() OVER (ORDER BY views DESC) AS rank
FROM (
    SELECT page_path, count() AS views
    FROM page_views
    WHERE toDate(event_time) = today() - 1
    GROUP BY page_path
)
LIMIT 100;
```

## Top-N with Ties

Handle ties by including all rows with the same value as the Nth entry:

```sql
SELECT page_path, views
FROM (
    SELECT page_path, count() AS views,
        dense_rank() OVER (ORDER BY count() DESC) AS dr
    FROM page_views WHERE event_time >= today() - 1
    GROUP BY page_path
)
WHERE dr <= 10;
```

## Summary

ClickHouse implements Top-N queries with `ORDER BY ... LIMIT` for exact results, `topK` and `topKWeighted` for approximate results over large datasets, and window functions for per-group Top-N rankings. Materialized views pre-compute daily top lists for dashboard queries that need sub-millisecond response times.
