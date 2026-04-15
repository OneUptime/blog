# How to Use minMap() and maxMap() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, minMap, maxMap, Map

Description: Learn how to find per-key minimum and maximum values across rows in ClickHouse using minMap() and maxMap() with array and Map column examples.

---

`minMap()` and `maxMap()` are ClickHouse aggregate functions that compute the minimum or maximum value for each key across all rows in a group. They are the natural companions to `sumMap()` - while `sumMap` accumulates totals per key, `minMap` and `maxMap` track the extreme values. This is particularly useful with sparse key-value data such as per-status-code latency records, per-tag metric readings, or per-category price observations stored as arrays or Map columns.

## Syntax

Both functions accept the same calling conventions as `sumMap`.

```sql
-- Two-array form
minMap(keys_array, values_array)
maxMap(keys_array, values_array)

-- Tuple literal form
minMap((keys_array, values_array))
maxMap((keys_array, values_array))

-- Map column form
minMap(map_column)
maxMap(map_column)
```

The return type is a tuple `(keys_array, min_or_max_values_array)` with keys sorted and deduplicated across all rows in the group.

## Basic Example with Array Columns

```sql
-- Each row records per-endpoint latencies for one server
-- endpoint_ids: [1, 2, 3]
-- latencies_ms: [45, 120, 8]

SELECT
    region,
    minMap(endpoint_ids, latencies_ms) AS min_latency_per_endpoint,
    maxMap(endpoint_ids, latencies_ms) AS max_latency_per_endpoint
FROM server_metrics
WHERE recorded_at >= now() - INTERVAL 1 HOUR
GROUP BY region;
```

## Accessing Keys and Values

```sql
SELECT
    region,
    minMap(endpoint_ids, latencies_ms).1 AS endpoints,
    minMap(endpoint_ids, latencies_ms).2 AS min_latencies,
    maxMap(endpoint_ids, latencies_ms).2 AS max_latencies
FROM server_metrics
GROUP BY region;
```

## Example with a Map Column

```sql
CREATE TABLE sensor_readings
(
    reading_date Date,
    station_id   UInt32,
    sensor_vals  Map(String, Float32)
    -- keys like 'temp', 'humidity', 'pressure'
)
ENGINE = MergeTree()
ORDER BY (reading_date, station_id);

-- Daily min and max for each sensor type per station
SELECT
    reading_date,
    station_id,
    minMap(sensor_vals) AS daily_min,
    maxMap(sensor_vals) AS daily_max
FROM sensor_readings
GROUP BY reading_date, station_id
ORDER BY reading_date, station_id;
```

## Use Case - Per-Category Price Range

```sql
-- Each order row contains category IDs and the prices paid
SELECT
    order_date,
    minMap(category_ids, prices).1 AS categories,
    minMap(category_ids, prices).2 AS lowest_prices,
    maxMap(category_ids, prices).2 AS highest_prices
FROM orders
WHERE order_date >= today() - 30
GROUP BY order_date
ORDER BY order_date;
```

## Use Case - SLO Monitoring - Min/Max Latency per Status Code

```sql
SELECT
    service_name,
    maxMap(status_codes, p99_latencies).1 AS codes,
    maxMap(status_codes, p99_latencies).2 AS worst_p99_per_code
FROM service_latency_buckets
WHERE window_start >= now() - INTERVAL 6 HOUR
GROUP BY service_name
ORDER BY service_name;
```

## Combining minMap, maxMap, and sumMap

You can compute multiple per-key statistics in a single GROUP BY pass.

```sql
SELECT
    campaign_id,
    sumMap(category_ids, revenue).2    AS total_revenue_per_category,
    minMap(category_ids, revenue).2    AS min_order_per_category,
    maxMap(category_ids, revenue).2    AS max_order_per_category,
    sumMap(category_ids, revenue).1    AS categories
FROM campaign_orders
WHERE order_date >= today() - 7
GROUP BY campaign_id;
```

## Unnesting Results with ARRAY JOIN

```sql
SELECT
    region,
    endpoint_id,
    min_latency,
    max_latency
FROM (
    SELECT
        region,
        minMap(endpoint_ids, latencies_ms).1 AS endpoint_keys,
        minMap(endpoint_ids, latencies_ms).2 AS min_vals,
        maxMap(endpoint_ids, latencies_ms).2 AS max_vals
    FROM server_metrics
    WHERE recorded_at >= now() - INTERVAL 1 HOUR
    GROUP BY region
)
ARRAY JOIN
    endpoint_keys AS endpoint_id,
    min_vals      AS min_latency,
    max_vals      AS max_latency
ORDER BY region, endpoint_id;
```

## Key Behaviors to Know

- Keys from all rows in the group are merged. If a key appears in only some rows, it still appears in the output with the min or max from those rows.
- Keys are sorted in ascending order in the output tuple, regardless of the insertion order.
- Value types must be numeric, date, or datetime. String values are not supported.
- Both functions are available in the `-State` and `-Merge` combinator forms for pre-aggregation with `AggregatingMergeTree`.

```sql
-- Pre-aggregated minMap in an AggregatingMergeTree
CREATE TABLE agg_latency
(
    service_name String,
    event_date   Date,
    min_latency  AggregateFunction(minMap, Array(UInt16), Array(UInt32))
)
ENGINE = AggregatingMergeTree()
ORDER BY (service_name, event_date);
```

## Summary

`minMap()` and `maxMap()` provide per-key extreme-value aggregation over sparse key-value data in ClickHouse without requiring a fixed schema or separate aggregation per key. They work with array pairs and native Map columns, return sorted and deduplicated key arrays, and compose naturally with `ARRAY JOIN` for row-level output. Use them alongside `sumMap()` in the same query to compute sum, min, and max in a single pass over the data.
