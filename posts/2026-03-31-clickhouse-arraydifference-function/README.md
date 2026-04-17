# How to Use arrayDifference() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayDifference, Time Series, Delta

Description: Learn how arrayDifference() computes consecutive element differences in ClickHouse arrays, enabling delta calculation and change detection in time-series array columns.

---

In time-series analysis, you frequently want to know not the absolute values but the changes between consecutive measurements: the delta between readings, the increment in a counter, or the step sizes in a sequence. `arrayDifference` computes these consecutive differences directly on array columns, returning a new array of the same length where each element is the arithmetic difference between adjacent original elements.

## Function Signature

```text
arrayDifference(arr) -> Array
```

The result array has the same length as the input. The first element is always `0` (there is no previous element to subtract). Each subsequent element `i` is `arr[i] - arr[i-1]`.

## Basic Usage

```sql
-- Basic integer differences
SELECT arrayDifference([10, 15, 13, 20, 18]) AS deltas;
-- Result: [0, 5, -2, 7, -2]
-- 0 (first), 15-10=5, 13-15=-2, 20-13=7, 18-20=-2

-- Monotonically increasing counter
SELECT arrayDifference([100, 105, 112, 120, 131]) AS increments;
-- Result: [0, 5, 7, 8, 11]

-- Constant array - all deltas are 0
SELECT arrayDifference([7, 7, 7, 7]) AS flat;
-- Result: [0, 0, 0, 0]

-- Float differences
SELECT arrayDifference([1.5, 2.8, 2.1, 3.9]) AS float_deltas;
-- Result: [0.0, 1.3, -0.7, 1.8]
```

## Detecting Rate of Change in Sensor Data

Stored time-series arrays benefit from `arrayDifference` to reveal how quickly values are changing between measurement intervals:

```sql
CREATE TABLE temperature_logs
(
    sensor_id UInt32,
    -- Temperatures recorded every 10 minutes
    readings Array(Float32)
) ENGINE = Memory;

INSERT INTO temperature_logs VALUES
    (1, [20.1, 20.3, 20.8, 22.5, 25.1, 26.0, 25.7, 25.2]),
    (2, [15.0, 15.0, 15.1, 15.0, 14.9, 15.0, 15.1, 15.0]),
    (3, [18.0, 20.5, 25.0, 30.1, 28.3, 24.0, 19.5]);

SELECT
    sensor_id,
    readings,
    arrayDifference(readings) AS deltas
FROM temperature_logs;

-- Find sensors with any sudden jump greater than 2 degrees in one interval
SELECT
    sensor_id,
    arrayFilter(d -> abs(d) > 2.0, arrayDifference(readings)) AS large_deltas
FROM temperature_logs
WHERE length(arrayFilter(d -> abs(d) > 2.0, arrayDifference(readings))) > 0;
-- sensor 1: [2.6] - one interval with |delta| > 2
-- sensor 3: [2.5, 4.5, 5.1, -4.3, -4.5] - volatile readings
```

## Computing Increments from Cumulative Counters

When arrays store cumulative totals (like running counters), `arrayDifference` recovers the per-interval increment:

```sql
CREATE TABLE cumulative_events
(
    page_id UInt32,
    -- Cumulative view counts at end of each hour
    hourly_cumulative Array(UInt64)
) ENGINE = Memory;

INSERT INTO cumulative_events VALUES
    (1, [0, 150, 310, 490, 580, 700, 850, 1020]),
    (2, [0, 50, 100, 150, 200]),
    (3, [1000, 1080, 1155, 1200]);

SELECT
    page_id,
    hourly_cumulative,
    -- Drop the first 0 delta (meaningless leading element)
    arraySlice(arrayDifference(hourly_cumulative), 2) AS hourly_increments
FROM cumulative_events;
-- page 1 increments: [150, 160, 180, 90, 120, 150, 170]
-- page 2 increments: [50, 50, 50, 50]
-- page 3 increments: [80, 75, 45]
```

## Finding the Maximum Delta

Combine `arrayDifference` with `arrayReduce` to find the largest single-step change:

```sql
SELECT
    sensor_id,
    arrayReduce('max', arrayMap(x -> abs(x), arrayDifference(readings))) AS max_single_step_change
FROM temperature_logs;
```

## Checking Monotonicity

An array is strictly increasing if all differences (after the first) are positive. Use `arrayReduce('min', ...)` on the differences slice:

```sql
SELECT
    sensor_id,
    -- Array is increasing if min delta (excluding leading 0) > 0
    arrayReduce('min', arraySlice(arrayDifference(readings), 2)) > 0 AS is_strictly_increasing
FROM temperature_logs;
-- sensor 1: 0 (not strictly increasing, has drops)
-- sensor 2: 0 (not strictly increasing, has 0 and negative deltas)
-- sensor 3: 0 (has drops)
```

## Velocity and Acceleration of Array Values

Applying `arrayDifference` twice computes the second-order difference - the rate of change of the rate of change (analogous to acceleration):

```sql
SELECT
    sensor_id,
    arrayDifference(readings) AS velocity,
    arrayDifference(arrayDifference(readings)) AS acceleration
FROM temperature_logs
WHERE sensor_id = 1;
-- velocity:     [0, 0.2, 0.5, 1.7, 2.6, 0.9, -0.3, -0.5]
-- acceleration: [0, 0.2, 0.3, 1.2, 0.9, -1.7, -1.2, -0.2]
```

## Detecting Flat Periods

Consecutive zeros in the difference array indicate a flat period where the value did not change. Use `arrayFilter` on the difference array to isolate the zero deltas:

```sql
-- Find whether the sensor had any flat periods (delta = 0)
SELECT
    sensor_id,
    arrayFilter(d -> d = 0, arraySlice(arrayDifference(readings), 2)) AS zero_deltas,
    length(arrayFilter(d -> d = 0, arraySlice(arrayDifference(readings), 2))) AS num_flat_intervals
FROM temperature_logs;
```

## Summary

`arrayDifference` computes consecutive element-wise differences in an array, with the first element always set to 0. It is the primary tool for extracting deltas from cumulative counters, computing rates of change in time-series arrays, detecting spikes or flat periods, and implementing second-order differentiation. Combined with `arrayFilter`, `arrayReduce`, and `arraySlice`, it powers a full suite of time-series analytics on stored array columns.
