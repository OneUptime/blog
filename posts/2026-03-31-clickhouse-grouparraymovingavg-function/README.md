# How to Use groupArrayMovingAvg() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, groupArrayMovingAvg, Moving Average

Description: Learn how to compute a moving average over ordered data in ClickHouse using groupArrayMovingAvg() with optional window size control.

---

`groupArrayMovingAvg()` is a ClickHouse aggregate function that collects values from a group into an array and replaces each element with the moving average up to that point. Unlike window functions in traditional SQL, this function works at aggregation time and returns a full array of averaged values, making it efficient for time-series smoothing and trend detection inside analytical queries.

## Syntax

The function has two forms: without a window and with a fixed window size.

```sql
-- Moving average over all preceding rows (expanding window)
groupArrayMovingAvg(column)

-- Moving average with a fixed window of N rows
groupArrayMovingAvg(N)(column)
```

When no window size is specified, each output element is the average of all elements from the first up to and including the current one. When `N` is provided, the average covers only the last `N` values.

## Basic Example - Expanding Moving Average

```sql
SELECT
    user_id,
    groupArrayMovingAvg(value) AS moving_avg
FROM (
    SELECT user_id, value
    FROM orders
    WHERE user_id = 42
    ORDER BY created_at
)
GROUP BY user_id;
```

Because `groupArrayMovingAvg` processes rows in the order they arrive at the aggregation stage, you must sort the input subquery or use `ORDER BY` inside an `arraySort` post-processing step to guarantee meaningful results.

## Windowed Moving Average

Use the window parameter to limit how many preceding values contribute to each average.

```sql
-- 7-day rolling average of daily revenue per region
SELECT
    region,
    groupArrayMovingAvg(7)(daily_revenue) AS rolling_7day
FROM (
    SELECT
        region,
        sum(amount) AS daily_revenue
    FROM sales
    WHERE event_date >= today() - 30
    GROUP BY region, event_date
    ORDER BY region, event_date
)
GROUP BY region;
```

The returned array has the same number of elements as the input group. For the first `N-1` elements the window is smaller than `N` - ClickHouse averages only the available preceding values.

## Pairing the Result Array with Dates

`groupArrayMovingAvg` is often combined with `groupArray` to keep the labels aligned with the averaged values.

```sql
SELECT
    sensor_id,
    groupArray(event_date)           AS dates,
    groupArrayMovingAvg(5)(reading)  AS smoothed_readings
FROM (
    SELECT sensor_id, event_date, avg(reading) AS reading
    FROM sensor_data
    WHERE event_date >= today() - 60
    GROUP BY sensor_id, event_date
    ORDER BY sensor_id, event_date
)
GROUP BY sensor_id;
```

Both arrays share the same index, so `dates[1]` corresponds to `smoothed_readings[1]`.

## Unnesting the Result for Row-Level Output

If you need each smoothed value on its own row rather than packed in an array, use `arrayJoin` or `ARRAY JOIN`.

```sql
SELECT
    sensor_id,
    date,
    smoothed
FROM (
    SELECT
        sensor_id,
        groupArray(event_date)          AS dates,
        groupArrayMovingAvg(5)(reading) AS smoothed_readings
    FROM (
        SELECT sensor_id, event_date, avg(reading) AS reading
        FROM sensor_data
        WHERE event_date >= today() - 60
        GROUP BY sensor_id, event_date
        ORDER BY sensor_id, event_date
    )
    GROUP BY sensor_id
)
ARRAY JOIN
    dates      AS date,
    smoothed_readings AS smoothed;
```

## Comparing Raw vs Smoothed Values

```sql
SELECT
    sensor_id,
    groupArray(reading)              AS raw_values,
    groupArrayMovingAvg(3)(reading)  AS smoothed_3,
    groupArrayMovingAvg(7)(reading)  AS smoothed_7
FROM (
    SELECT sensor_id, event_date, avg(reading) AS reading
    FROM sensor_data
    WHERE sensor_id = 'TEMP_001'
      AND event_date >= today() - 30
    GROUP BY sensor_id, event_date
    ORDER BY event_date
)
GROUP BY sensor_id;
```

This lets you evaluate the effect of different window sizes on noise reduction before committing to one in production.

## Data Type Considerations

`groupArrayMovingAvg` returns an array of the same size and type as the input data. For integer inputs, the function uses rounding toward zero and truncates decimal places not representable in the resulting data type, so averaging integers often yields a lossy result. To preserve fractional precision, cast the input to a floating-point type before aggregation, and optionally apply `arrayMap` to control rounding.

```sql
SELECT
    sensor_id,
    arrayMap(x -> round(x, 2), groupArrayMovingAvg(7)(toFloat64(reading))) AS smoothed
FROM (
    SELECT sensor_id, event_date, avg(reading) AS reading
    FROM sensor_data
    GROUP BY sensor_id, event_date
    ORDER BY sensor_id, event_date
)
GROUP BY sensor_id;
```

## Summary

`groupArrayMovingAvg()` provides an efficient way to compute moving averages inside ClickHouse aggregation queries without needing window function syntax. Supply an optional window size `N` to control how many preceding values contribute to each average, and pair it with `groupArray()` to keep date or label arrays aligned. Use `ARRAY JOIN` to expand results into individual rows when downstream tools expect tabular output.
