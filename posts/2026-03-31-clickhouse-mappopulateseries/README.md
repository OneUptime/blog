# How to Use mapPopulateSeries() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Map Function, Time Series, Gap Filling

Description: Learn how mapPopulateSeries() fills missing integer keys in a Map sequence in ClickHouse, ensuring complete key coverage for time series stored as maps.

---

`mapPopulateSeries()` fills in missing integer keys in a Map to produce a contiguous sequence from the minimum key present in the input up to the maximum key (or a specified maximum), assigning zero to any inserted keys. This is essential when working with time series or sequence data stored as Maps, where gaps in the key space need to be filled to enable downstream aggregations, visualizations, or comparisons that assume complete coverage.

## Function Signature

```text
mapPopulateSeries(keys_array, values_array [, max])
mapPopulateSeries(map [, max])
```

The function accepts either a Map directly or two parallel arrays of integer keys and numeric values. The `max` parameter is optional; if omitted, the sequence is filled up to the largest key present in the input. All keys must be integers (any integer type). Values must be numeric.

## Basic Usage

Create a sparse Map with gaps and fill the missing keys.

```sql
SELECT mapPopulateSeries(map(1, 10, 3, 30, 7, 70), 8) AS filled;
```

The result fills keys 2, 4, 5, 6 with zero, producing a map with contiguous integer keys from 1 to 8: `{1: 10, 2: 0, 3: 30, 4: 0, 5: 0, 6: 0, 7: 70, 8: 0}`.

Using the array form directly.

```sql
SELECT mapPopulateSeries([1, 3, 5], [100, 300, 500], 7) AS filled_from_arrays;
```

## Setting Up a Sample Table

Create a table that stores hourly event counts as a Map keyed by hour-of-day (0-23), where only hours with events are stored.

```sql
CREATE TABLE hourly_event_maps
(
    user_id     UInt64,
    event_date  Date,
    hour_counts Map(UInt8, UInt32)
)
ENGINE = MergeTree
ORDER BY (user_id, event_date);

INSERT INTO hourly_event_maps VALUES
(101, '2024-06-01', map(0, 2, 9, 5, 10, 12, 11, 8, 14, 3, 17, 9)),
(102, '2024-06-01', map(0, 1, 8, 2, 12, 7, 13, 15, 18, 4, 22, 1)),
(103, '2024-06-01', map(0, 3, 10, 20, 11, 18, 12, 25, 13, 22));
```

## Filling to 24 Hours for Complete Coverage

Apply `mapPopulateSeries()` with a max of 23 to ensure all 24 hours (0 through 23) are present in the map, filling gaps with zero.

```sql
SELECT
    user_id,
    event_date,
    mapPopulateSeries(hour_counts, 23) AS complete_hourly_counts
FROM hourly_event_maps;
```

Because every row has at least key 0 (the minimum hour), the function fills from 0 through 23, producing exactly 24 entries per row and making per-hour comparisons and visualizations reliable.

## Computing Hour-by-Hour Totals Across Users

With complete maps, it is safe to sum values at specific keys across users without worrying about missing entries.

```sql
SELECT
    hour_key,
    sum(count_at_hour) AS total_events
FROM (
    SELECT
        arr.1 AS hour_key,
        arr.2 AS count_at_hour
    FROM hourly_event_maps
    ARRAY JOIN arrayZip(
        mapKeys(mapPopulateSeries(hour_counts, 23)),
        mapValues(mapPopulateSeries(hour_counts, 23))
    ) AS arr
)
GROUP BY hour_key
ORDER BY hour_key;
```

## Filling Sequence-Based Maps

`mapPopulateSeries()` is equally useful for any sequential integer key space, such as step indices in a funnel, day-of-week counters, or position indices.

```sql
CREATE TABLE funnel_steps
(
    session_id  String,
    step_counts Map(UInt8, UInt32)
)
ENGINE = MergeTree
ORDER BY session_id;

INSERT INTO funnel_steps VALUES
('sess-001', map(1, 1, 3, 1, 5, 1)),
('sess-002', map(1, 1, 2, 1, 3, 1, 4, 1)),
('sess-003', map(1, 1));
```

Fill all 5 funnel steps for every session, making step completion analysis straightforward.

```sql
SELECT
    session_id,
    mapPopulateSeries(step_counts, 5) AS all_steps
FROM funnel_steps;
```

## Verifying Completeness After Population

After populating, confirm that every expected key is present by checking the map length.

```sql
SELECT
    user_id,
    length(mapPopulateSeries(hour_counts, 23)) AS key_count,
    key_count = 24 AS is_complete
FROM hourly_event_maps;
```

## Summary

`mapPopulateSeries()` ensures complete integer key coverage in Map columns, eliminating gaps that would cause incorrect comparisons or misleading aggregations. It accepts either a Map directly or parallel arrays of keys and values, and fills missing integer positions between the minimum and the specified maximum with zero values. Use it before joining Maps across rows, before array-based per-position aggregations, and any time the downstream analysis assumes a full contiguous key sequence. Pair it with `mapKeys()`, `mapValues()`, and `arrayZip()` to integrate the filled maps into broader query pipelines.
