# How to Use groupArrayInsertAt() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, GroupArrayInsertAt

Description: Learn how to use groupArrayInsertAt() in ClickHouse to build sparse arrays by inserting values at specific positions, with default values and size control.

---

`groupArrayInsertAt(value, position)` is a ClickHouse aggregate function that builds an array by inserting each row's value at a specified index position. Unlike `groupArray()`, which appends values in processing order, `groupArrayInsertAt` lets you control exactly which slot each value occupies in the output array. This makes it ideal for constructing fixed-slot timelines, sparse matrices, and positional data structures where gaps should be filled with a default value.

## Syntax

```sql
groupArrayInsertAt(default_value, array_size)(value, position)
groupArrayInsertAt(value, position)
```

- `value` - the value to insert
- `position` - the zero-based index at which to place `value`
- `default_value` (optional) - the fill value for unoccupied positions (defaults to zero or empty string)
- `array_size` (optional) - the fixed length of the output array

## Basic Usage

```sql
CREATE TABLE slot_metrics
(
    metric_id UInt32,
    slot      UInt32,   -- zero-based position index
    value     Float64
)
ENGINE = MergeTree()
ORDER BY (metric_id, slot);

INSERT INTO slot_metrics VALUES
    (1, 0, 10.0),
    (1, 2, 30.0),
    (1, 4, 50.0);  -- slots 1 and 3 have no data

-- Build a 5-element array, filling gaps with 0.0
SELECT
    metric_id,
    groupArrayInsertAt(0.0, 5)(value, slot) AS values_array
FROM slot_metrics
GROUP BY metric_id;
```

Output:
```text
metric_id | values_array
----------|------------------------------
1         | [10.0, 0.0, 30.0, 0.0, 50.0]
```

Slot 1 and slot 3 are filled with the default value `0.0` because no rows contributed to those positions.

## Positional Timeline Construction

A common use case is building a fixed-length time series array where each position corresponds to a time bucket (hour of day, day of week, etc.).

```sql
CREATE TABLE hourly_counts
(
    service   String,
    hour_of_day UInt8,    -- 0-23
    request_count UInt32
)
ENGINE = MergeTree()
ORDER BY (service, hour_of_day);

INSERT INTO hourly_counts VALUES
    ('api', 0, 120), ('api', 1, 95),  ('api', 6, 310),
    ('api', 12, 850),('api', 18, 620),('api', 23, 200),
    ('web', 0, 50),  ('web', 8, 400), ('web', 17, 920);

-- 24-element array (one slot per hour), zero for missing hours
SELECT
    service,
    groupArrayInsertAt(0, 24)(request_count, hour_of_day) AS hourly_profile
FROM hourly_counts
GROUP BY service;
```

This produces a 24-element array ready for visualization - sparklines, heatmaps, or client-side charting.

## Default Values for Different Types

The default fill value must match the type of `value`. Common examples:

```sql
-- Integer with 0 default
SELECT groupArrayInsertAt(0, 10)(toUInt32(val), pos) FROM my_table GROUP BY id;

-- Float with 0.0 default
SELECT groupArrayInsertAt(0.0, 10)(toFloat64(val), pos) FROM my_table GROUP BY id;

-- String with empty string default
SELECT groupArrayInsertAt('', 10)(label, pos) FROM my_table GROUP BY id;
```

Note that `groupArrayInsertAt` does not preserve `NULL` values from `Nullable` columns — NULLs are skipped by the aggregation (this is the standard ClickHouse aggregate-function behavior). If you need NULL-aware positional aggregation, wrap the value in a tuple, e.g. `groupArrayInsertAt(tuple(toNullable(val)), pos).1`.

## Omitting Default and Size

When called without `default_value` and `array_size`, ClickHouse uses the type's zero value as default and sizes the array to `max(position) + 1`:

```sql
-- Auto-sized array, zero-filled gaps
SELECT
    metric_id,
    groupArrayInsertAt(value, slot) AS values_array
FROM slot_metrics
GROUP BY metric_id;
```

This is convenient for exploratory queries but can produce unexpectedly large arrays if position values are large. Always specify `array_size` in production queries.

## Handling Conflicts at the Same Position

If two rows in the same group have the same `position` value, `groupArrayInsertAt` inserts one of the values and discards the other. The behavior is nondeterministic when there are conflicts. Ensure position values are unique within each group before using this function.

```sql
-- Deduplicate conflicts before aggregating
SELECT
    metric_id,
    groupArrayInsertAt(0.0, 5)(value, slot) AS values_array
FROM (
    SELECT metric_id, slot, any(value) AS value
    FROM slot_metrics
    GROUP BY metric_id, slot
)
GROUP BY metric_id;
```

## Combining with arraySum and arrayMap

The resulting arrays from `groupArrayInsertAt` can be fed directly into array functions:

```sql
-- Compute cumulative sum over the positional array
SELECT
    service,
    groupArrayInsertAt(0, 24)(request_count, hour_of_day) AS hourly_raw,
    arrayCumSum(groupArrayInsertAt(0, 24)(request_count, hour_of_day)) AS hourly_cumulative
FROM hourly_counts
GROUP BY service;
```

```sql
-- Normalize by total to get a fraction profile
SELECT
    service,
    arrayMap(
        x -> round(x / arraySum(hourly_raw) * 100, 1),
        hourly_raw
    ) AS pct_per_hour
FROM (
    SELECT
        service,
        groupArrayInsertAt(0, 24)(request_count, hour_of_day) AS hourly_raw
    FROM hourly_counts
    GROUP BY service
);
```

## Summary

`groupArrayInsertAt(default, size)(value, position)` builds a fixed-length sparse array by placing each value at a specified zero-based index position, filling unoccupied slots with a default value. It is ideal for constructing positional timelines, hour-of-day profiles, and any structure where the array index carries semantic meaning. Always specify the array size explicitly in production queries to avoid unexpectedly large output arrays, and ensure position values are unique within each group to avoid nondeterministic conflict resolution.
