# How to Use -ForEach Combinator in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Combinator, Array, Aggregation, SQL

Description: Learn how to use the -ForEach combinator in ClickHouse to apply aggregate functions element-wise across arrays of equal length from multiple rows.

---

## Overview

The `-ForEach` combinator in ClickHouse transforms an aggregate function so it operates element-by-element across arrays from multiple rows. Instead of aggregating rows to a single value, it produces an array where each position is the aggregated result of the corresponding position across all input arrays.

## Basic Syntax

Append `ForEach` to any aggregate function name:

```sql
SELECT sumForEach(values_array)
FROM metrics_table;
```

If each row has `values_array = [1, 2, 3]`, `sumForEach` returns `[sum_of_pos0, sum_of_pos1, sum_of_pos2]` across all rows.

## Concrete Example: Daily Hourly Counts

Suppose each row has an array of 24 hourly counts (one per hour):

```sql
CREATE TABLE daily_hourly (
    date          Date,
    region        String,
    hourly_counts Array(UInt32)
) ENGINE = MergeTree()
ORDER BY (date, region);

INSERT INTO daily_hourly VALUES
    ('2025-01-01', 'us-east', [10,12,8,5,3,2,1,4,9,15,20,18,22,25,23,21,19,17,14,11,9,7,6,5]),
    ('2025-01-01', 'us-east', [8,9,7,4,2,1,1,3,7,12,18,15,19,21,20,18,16,14,12,9,7,6,5,4]);

SELECT
    date,
    region,
    sumForEach(hourly_counts) AS total_by_hour
FROM daily_hourly
GROUP BY date, region;
```

The result is a single array with the summed count at each hour position.

## avgForEach for Time-Series Baseline

```sql
SELECT
    region,
    avgForEach(hourly_counts) AS avg_hourly_baseline
FROM daily_hourly
WHERE date >= today() - 7
GROUP BY region;
```

This computes the average traffic at each hour-of-day over the past 7 days.

## maxForEach and minForEach

```sql
SELECT
    service,
    maxForEach(cpu_by_core)  AS peak_per_core,
    minForEach(cpu_by_core)  AS min_per_core
FROM host_metrics
WHERE ts >= now() - INTERVAL 1 HOUR
GROUP BY service;
```

## Comparing Two Time Windows

```sql
SELECT
    region,
    avgForEach(hourly_counts) AS this_week_avg
FROM daily_hourly
WHERE date >= today() - 7
GROUP BY region;
-- Run similar query for last week and compare arrays
```

## Practical Use: Per-Position Percentile

You can use `quantilesForEach` if supported, or build your own by unnesting:

```sql
SELECT
    arrayMap((pos, val) -> (pos, val),
        range(length(sumForEach(hourly_counts))),
        sumForEach(hourly_counts)
    ) AS hour_totals
FROM daily_hourly
WHERE date = today();
```

## Important Constraints

- Arrays of equal length across rows produce predictable per-position aggregates.
- If arrays differ in length, the result has the length of the longest input array, with missing positions in shorter arrays skipped during aggregation.
- Works with any aggregate function, not just numeric ones — common examples include `sum`, `avg`, `min`, `max`, `count`, `uniq`, and `groupArray`.

```sql
-- Ensure consistent array length before using ForEach
SELECT sumForEach(hourly_counts)
FROM daily_hourly
WHERE length(hourly_counts) = 24
GROUP BY date;
```

## Summary

The `-ForEach` combinator applies aggregate functions position-by-position across same-length arrays, enabling time-series vectorized aggregation and per-slot statistics. It is ideal for hourly or bucketed metrics stored as arrays, and pairs well with `avgForEach` for baseline computation and `maxForEach` for peak detection.
