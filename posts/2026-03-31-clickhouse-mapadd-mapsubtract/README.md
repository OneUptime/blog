# How to Use mapAdd() and mapSubtract() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Map Function, Aggregation, Data Transformation

Description: Learn how mapAdd() and mapSubtract() merge Maps by summing or subtracting values for shared keys, with examples for combining metric maps and event counters.

---

`mapAdd()` and `mapSubtract()` are ClickHouse functions for combining two or more Maps by performing arithmetic on their values. When two maps share a key, `mapAdd()` sums the values while `mapSubtract()` computes the difference. For `mapAdd()`, keys present in only one map are included with their original value. For `mapSubtract()`, keys unique to the first map keep their value, while keys unique to later maps appear negated. These functions are especially useful for aggregating pre-aggregated metric maps, merging counters, or computing deltas between snapshot maps.

## Function Signatures

```text
mapAdd(map1, map2 [, ...])       -- merge maps, summing values for shared keys
mapSubtract(map1, map2 [, ...])  -- merge maps, subtracting subsequent map values
```

Both functions require that all input maps share the same key type and the same numeric value type.

## Basic Usage

Observe how shared and non-shared keys are handled in a simple inline example.

```sql
SELECT
    mapAdd(
        map('requests', 100, 'errors', 5),
        map('requests', 200, 'errors', 3, 'timeouts', 2)
    ) AS combined_metrics;
```

The result is `{'requests': 300, 'errors': 8, 'timeouts': 2}`. Keys present in both maps have their values summed; keys present in only one map are carried through unchanged.

```sql
SELECT
    mapSubtract(
        map('requests', 300, 'errors', 8, 'timeouts', 2),
        map('requests', 100, 'errors', 5)
    ) AS delta_metrics;
```

The result is `{'requests': 200, 'errors': 3, 'timeouts': 2}`.

## Setting Up a Sample Table

Create a table that stores per-service metric snapshots as Map columns. Each row represents a five-minute aggregation window for a given service.

```sql
CREATE TABLE service_metrics
(
    service_name String,
    window_start DateTime,
    counters     Map(String, Int64)
)
ENGINE = MergeTree
ORDER BY (service_name, window_start);

INSERT INTO service_metrics VALUES
('api-gateway',  '2024-03-01 12:00:00', map('requests', 4200, 'errors', 12, 'cache_hits', 3100)),
('api-gateway',  '2024-03-01 12:05:00', map('requests', 3950, 'errors', 8,  'cache_hits', 2800)),
('api-gateway',  '2024-03-01 12:10:00', map('requests', 4600, 'errors', 21, 'cache_hits', 3400)),
('auth-service', '2024-03-01 12:00:00', map('requests', 1100, 'errors', 2,  'token_refreshes', 320)),
('auth-service', '2024-03-01 12:05:00', map('requests', 980,  'errors', 1,  'token_refreshes', 290)),
('auth-service', '2024-03-01 12:10:00', map('requests', 1250, 'errors', 5,  'token_refreshes', 410));
```

## Aggregating Maps with sumMap

For aggregating many map rows into a single merged map, use the `sumMap()` aggregate function, which applies mapAdd-style logic across all rows in a group.

```sql
SELECT
    service_name,
    sumMap(counters) AS total_counters
FROM service_metrics
GROUP BY service_name;
```

## Combining Two Maps from Different Rows

Use `mapAdd()` to manually merge two specific rows - for example, combining the first and last windows to compare start vs end of a period.

```sql
SELECT mapAdd(
    (SELECT counters FROM service_metrics WHERE service_name = 'api-gateway' AND window_start = '2024-03-01 12:00:00'),
    (SELECT counters FROM service_metrics WHERE service_name = 'api-gateway' AND window_start = '2024-03-01 12:10:00')
) AS combined_first_and_last;
```

## Computing Deltas Between Windows

Use `mapSubtract()` to find the change in counters between two time windows. This is useful for measuring rate-of-change or detecting anomalies.

```sql
WITH
    first_window AS (
        SELECT counters
        FROM service_metrics
        WHERE service_name = 'api-gateway'
          AND window_start = '2024-03-01 12:00:00'
    ),
    last_window AS (
        SELECT counters
        FROM service_metrics
        WHERE service_name = 'api-gateway'
          AND window_start = '2024-03-01 12:10:00'
    )
SELECT mapSubtract(last_window.counters, first_window.counters) AS delta
FROM last_window, first_window;
```

## Merging Tag Frequency Maps

A practical use case is accumulating tag frequency maps from individual documents. Each row stores a map of tag to occurrence count, and `mapAdd()` combines them.

```sql
CREATE TABLE document_tag_counts
(
    doc_id   UInt64,
    tag_freq Map(String, UInt32)
)
ENGINE = MergeTree
ORDER BY doc_id;

INSERT INTO document_tag_counts VALUES
(1, map('sql', 5, 'database', 3, 'performance', 2)),
(2, map('sql', 2, 'indexing', 4, 'performance', 1)),
(3, map('database', 6, 'indexing', 2, 'replication', 3));
```

Merge tag counts across all documents to build a global frequency map.

```sql
SELECT sumMap(tag_freq) AS global_tag_frequency
FROM document_tag_counts;
```

## Using mapSubtract to Apply Refunds or Corrections

In financial or inventory systems, `mapSubtract()` can apply a correction map to a running total map.

```sql
SELECT
    mapSubtract(
        map('product_A', 150, 'product_B', 80, 'product_C', 60),
        map('product_A', 10, 'product_C', 5)
    ) AS adjusted_inventory;
```

The result reflects refunded or corrected quantities only for the keys present in the correction map.

## Summary

`mapAdd()` and `mapSubtract()` provide a concise way to combine Maps by performing arithmetic on shared keys while preserving unshared keys. Use `mapAdd()` to merge metric maps, accumulate event counters, or sum tag frequencies. Use `mapSubtract()` to compute deltas, apply corrections, or remove contributions from a combined map. For aggregating across many rows, prefer the `sumMap()` aggregate function which applies the same merge logic efficiently across the entire result set.
