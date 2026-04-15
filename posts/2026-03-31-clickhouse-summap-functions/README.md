# How to Use sumMap() and sumMapFiltered() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, sumMap, Map, Array

Description: Learn how to aggregate per-key sums across rows using sumMap() and sumMapFiltered() in ClickHouse with array and map column examples.

---

`sumMap()` is a ClickHouse aggregate function that sums values for matching keys across multiple rows, returning a pair of arrays (or a Map) with unique keys and their accumulated totals. It is the go-to function when your data stores sparse key-value metrics - such as error counts per status code, revenue per product category, or event counts per tag - and you want to roll them up without pivoting the table or writing one aggregation per key.

## Syntax

`sumMap` accepts two equivalent calling conventions.

```sql
-- Tuple / two-array form
sumMap(keys_array, values_array)

-- Nested tuple literal form
sumMap((keys_array, values_array))
```

Both return a tuple `(keys_array, summed_values_array)` where keys are sorted and deduplicated. When the input column is of type `Map(K, V)`, pass it directly.

```sql
-- Map column form
sumMap(map_column)
```

## Basic Example with Array Columns

```sql
-- Table stores per-request HTTP status code counts as arrays
-- status_codes: [200, 404, 500]
-- counts:       [  5,   2,   1]

SELECT
    service_name,
    sumMap(status_codes, counts) AS aggregated
FROM request_stats
WHERE request_date = today() - 1
GROUP BY service_name;
-- Returns: ([200, 404, 500], [total_200, total_404, total_500])
```

## Accessing Keys and Values from the Result

The result is a tuple, so use `.1` and `.2` (or `tupleElement`) to access keys and values.

```sql
SELECT
    service_name,
    sumMap(status_codes, counts).1 AS keys,
    sumMap(status_codes, counts).2 AS values
FROM request_stats
GROUP BY service_name;
```

## Example with a Map Column

```sql
-- Table with a Map(String, UInt64) column for per-event-type counts
CREATE TABLE daily_event_counts
(
    event_date   Date,
    user_id      UInt64,
    event_counts Map(String, UInt64)
)
ENGINE = MergeTree()
ORDER BY (event_date, user_id);

-- Aggregate all users' event counts for a given day
SELECT
    event_date,
    sumMap(event_counts) AS total_by_event_type
FROM daily_event_counts
WHERE event_date >= today() - 7
GROUP BY event_date;
```

## sumMapFiltered - Restrict to Specific Keys

`sumMapFiltered` is a parametric aggregate function that takes the same arguments as `sumMap`. The filter — a constant array of keys you care about — is passed as the function parameter (in the first set of parentheses), while the key and value arrays remain the function arguments (in the second set). This avoids accumulating data for hundreds of keys when you only need a few.

```sql
-- Only sum values for HTTP status codes 200 and 500
SELECT
    service_name,
    sumMapFiltered([200, 500])(status_codes, counts) AS filtered_agg
FROM request_stats
GROUP BY service_name;
```

The filter list must be a constant array and must match the key type.

## Practical Use Case - Revenue per Product Category

```sql
-- Each row stores a basket: category IDs and line-item revenues
SELECT
    order_date,
    sumMap(category_ids, line_revenues).1 AS categories,
    sumMap(category_ids, line_revenues).2 AS total_revenue
FROM orders
WHERE order_date >= today() - 30
GROUP BY order_date
ORDER BY order_date;
```

## Practical Use Case - Tag-level Metric Aggregation

```sql
-- Monitoring data: each row is one scrape with tag-to-value map
SELECT
    metric_name,
    sumMap(tag_counts) AS totals_by_tag
FROM monitoring_scrapes
WHERE scraped_at >= now() - INTERVAL 1 HOUR
GROUP BY metric_name;
```

## Unnesting Results for Row-Level Output

```sql
SELECT
    service_name,
    status_code,
    total_count
FROM (
    SELECT
        service_name,
        sumMap(status_codes, counts).1 AS keys,
        sumMap(status_codes, counts).2 AS vals
    FROM request_stats
    GROUP BY service_name
)
ARRAY JOIN
    keys AS status_code,
    vals AS total_count
ORDER BY service_name, status_code;
```

## Combining sumMap with Other Aggregates

```sql
SELECT
    event_date,
    sum(total_requests)                    AS requests,
    avg(latency_ms)                        AS avg_latency,
    sumMap(status_codes, counts)           AS status_breakdown
FROM request_stats
WHERE event_date >= today() - 14
GROUP BY event_date
ORDER BY event_date;
```

## Summary

`sumMap()` eliminates the need for pre-defined pivot columns when aggregating sparse key-value data in ClickHouse. It works with both array pairs and native Map columns, sorts and deduplicates keys automatically, and composes cleanly with `ARRAY JOIN` to expand results into rows. Use `sumMapFiltered()` when you only need a subset of keys to keep output size and memory usage predictable.
