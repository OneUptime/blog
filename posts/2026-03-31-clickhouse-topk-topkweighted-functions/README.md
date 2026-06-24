# How to Use topK() and topKWeighted() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, TopK, Top-N, Frequency

Description: Learn how to use topK() and topKWeighted() in ClickHouse to find the most frequent or highest-weight values using the Space-Saving heavy hitters algorithm.

---

Finding the top N most frequent values in a large dataset is a common analytical need - top error codes, most-visited pages, highest-traffic endpoints. ClickHouse provides `topK(N)` and `topKWeighted(N)` as approximate aggregate functions built on the Filtered Space-Saving algorithm. They return results in constant memory regardless of input size, making them practical for streaming and batch analytics over billions of rows.

## How topK() Works

`topK(N)` returns an array of approximately the N most frequently occurring values in a column. It uses the Filtered Space-Saving algorithm, which maintains a summary of at most N candidate items with their estimated counts. Values not in the summary may be undercounted, so results are approximate, but in practice the top items are identified reliably.

```sql
-- Return the 5 most frequent values in a column
SELECT topK(5)(column_name) FROM table_name;
```

The result is an `Array` of the top N values, ordered from most to least frequent.

## Basic topK() Examples

### Top Error Codes

```sql
-- Find the 10 most frequent HTTP error codes in the last 24 hours
SELECT topK(10)(status_code) AS top_errors
FROM http_logs
WHERE status_code >= 400
  AND timestamp >= now() - INTERVAL 24 HOUR;
```

### Top Pages by Visit Frequency

```sql
-- Top 5 most visited pages per day
SELECT
    toDate(timestamp) AS visit_date,
    topK(5)(page_path) AS top_pages
FROM page_views
GROUP BY visit_date
ORDER BY visit_date DESC
LIMIT 7;
```

### Top Endpoints in a Service

```sql
-- Most frequently called API endpoints per service
SELECT
    service_name,
    topK(3)(endpoint) AS top_endpoints
FROM request_logs
WHERE log_date = today()
GROUP BY service_name;
```

## Expanding topK Results with arrayJoin

Since `topK()` returns an array, use `arrayJoin()` to expand results into rows for further processing.

```sql
-- Expand top pages into rows with their rank
SELECT
    visit_date,
    arrayJoin(topK(5)(page_path)) AS top_page
FROM page_views
GROUP BY visit_date
ORDER BY visit_date DESC;
```

## Using topKWeighted()

`topKWeighted(N)(value, weight)` extends `topK()` by accepting a weight for each value. Each occurrence of a value contributes its weight to the frequency sum rather than a count of 1. This is useful when you want the top items by revenue, bytes transferred, or any other numeric measure rather than raw occurrence count.

```sql
-- Syntax
SELECT topKWeighted(N)(value_column, weight_column) FROM table_name;
```

### Top Products by Revenue

```sql
-- Top 5 products by total revenue (not just transaction count)
SELECT topKWeighted(5)(product_id, revenue_cents) AS top_revenue_products
FROM orders
WHERE order_date >= today() - 30;
```

### Top Endpoints by Response Bytes

```sql
-- Top 10 endpoints consuming the most bandwidth
SELECT
    service_name,
    topKWeighted(10)(endpoint, response_bytes) AS bandwidth_heavy_endpoints
FROM request_logs
WHERE log_date = today()
GROUP BY service_name;
```

### Top Users by CPU Time

```sql
-- Top 5 users driving the most CPU time in queries
SELECT topKWeighted(5)(user, query_duration_ms) AS cpu_heavy_users
FROM system.query_log
WHERE event_date = today()
  AND type = 'QueryFinish';
```

## Accuracy and Tuning

Both functions accept an optional second parameter for the internal summary size (load factor). A larger summary improves accuracy at the cost of more memory.

```sql
-- topK with custom load factor (default is 3)
-- topK(N, load_factor)(column)
SELECT topK(10, 100)(page_path) AS accurate_top_pages
FROM page_views
WHERE event_date = today();
```

The default load factor is `3`, giving a summary size of `3 * N` items. This is adequate for most use cases. Increase the load factor if results look inaccurate on highly skewed distributions.

## Combining topK with Other Aggregates

```sql
-- Top 5 error codes with their counts and percentage of total
SELECT
    error_code,
    count() AS occurrences,
    round(100.0 * count() / sum(count()) OVER (), 2) AS pct
FROM http_logs
WHERE status_code >= 500
  AND log_date = today()
GROUP BY error_code
ORDER BY occurrences DESC
LIMIT 5;
```

```sql
-- Use topK in a subquery to filter to only top items
SELECT
    page_path,
    uniq(user_id) AS unique_users,
    avg(load_time_ms) AS avg_load_time
FROM page_views
WHERE page_path IN (
    SELECT arrayJoin(topK(20)(page_path))
    FROM page_views
    WHERE event_date = today()
)
  AND event_date = today()
GROUP BY page_path
ORDER BY unique_users DESC;
```

## topK in Materialized Views

```sql
-- Daily summary of top error codes, stored as arrays
CREATE TABLE daily_top_errors
(
    error_date  Date,
    service     String,
    top_codes   Array(UInt16)
)
ENGINE = MergeTree()
ORDER BY (error_date, service);

INSERT INTO daily_top_errors
SELECT
    toDate(timestamp) AS error_date,
    service_name      AS service,
    topK(10)(status_code) AS top_codes
FROM http_logs
WHERE status_code >= 500
GROUP BY error_date, service;
```

## Summary

`topK(N)` and `topKWeighted(N)` provide memory-efficient approximate heavy hitters detection using the Filtered Space-Saving algorithm. `topK()` finds the most frequently occurring values by count, while `topKWeighted()` ranks values by a numeric weight such as revenue or bytes transferred. Both functions are approximate but reliable for identifying dominant items in high-cardinality datasets, and they integrate cleanly into GROUP BY queries, materialized views, and subquery filters.
