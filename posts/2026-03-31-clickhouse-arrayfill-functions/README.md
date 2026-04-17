# How to Use arrayFill() and arrayReverseFill() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayFill, arrayReverseFill, Forward Fill

Description: Learn how arrayFill() and arrayReverseFill() propagate values forward or backward through ClickHouse arrays to fill gaps, enabling forward-fill and backward-fill of missing array data.

---

Missing values in time-series arrays are a ubiquitous data quality challenge. When a sensor skips a reading or a sparse event log has NULL gaps, you typically want to carry the last known value forward (forward-fill) or propagate the next known value backward (backward-fill). `arrayFill` and `arrayReverseFill` implement these patterns directly on arrays, without unnesting to rows first.

## Function Signatures

```text
arrayFill(func, arr1 [, arr2, ...])        -> Array(T)
arrayReverseFill(func, arr1 [, arr2, ...]) -> Array(T)
```

- `func` - a lambda that receives the current element (and optionally parallel array elements) and returns 1 if the element should be **kept as-is** (is "valid"), or 0 if it should be **replaced by the previous valid value**
- `arrayFill` processes left-to-right (forward-fill)
- `arrayReverseFill` processes right-to-left (backward-fill)

Important: the lambda returns 1 to **keep** the value and 0 to **fill over** it. This is the opposite of what you might expect from a "fill condition."

## Basic Forward-Fill

Forward-fill carries the most recent non-sentinel value into any position where the lambda returns 0:

```sql
-- Forward-fill: 0 means "replace this with the previous valid value"
-- Lambda returns 0 for the value 0 (treat 0 as a gap marker)
SELECT arrayFill(
    x -> (x != 0),
    [1, 0, 0, 4, 0, 6]
) AS forward_filled;
-- Position 2 and 3 (zeros) are filled with 1 (last valid)
-- Position 5 (zero) is filled with 4 (last valid)
-- Result: [1, 1, 1, 4, 4, 6]

-- Forward-fill with NULL as the gap marker (Nullable array)
SELECT arrayFill(
    x -> (x IS NOT NULL),
    [1, NULL, NULL, 4, NULL, 6]
) AS null_forward_filled;
-- Result: [1, 1, 1, 4, 4, 6]
```

## Basic Backward-Fill

`arrayReverseFill` scans from right to left and fills gaps with the next valid value to the right:

```sql
-- Backward-fill: 0 means "replace this with the next valid value"
SELECT arrayReverseFill(
    x -> (x != 0),
    [1, 0, 0, 4, 0, 6]
) AS backward_filled;
-- Position 2 and 3 are filled with 4 (next valid to the right)
-- Position 5 is filled with 6 (next valid to the right)
-- Result: [1, 4, 4, 4, 6, 6]

-- Leading zeros filled from right
SELECT arrayReverseFill(
    x -> (x != 0),
    [0, 0, 3, 0, 5]
) AS leading_zero_fill;
-- Result: [3, 3, 3, 5, 5]
```

## Filling Sensor Data Gaps

Consider a temperature sensor that occasionally fails to report, leaving a zero placeholder:

```sql
CREATE TABLE sensor_logs
(
    sensor_id UInt32,
    -- 0 means the sensor failed to report that hour
    hourly_readings Array(Float32)
) ENGINE = Memory;

INSERT INTO sensor_logs VALUES
    (1, [20.1, 0.0, 0.0, 22.5, 0.0, 23.1, 23.1, 0.0]),
    (2, [0.0, 0.0, 15.5, 16.0, 0.0, 0.0, 14.8, 15.1]),
    (3, [18.0, 18.5, 19.0, 19.5, 20.0]);

-- Forward-fill: carry last known temperature forward
SELECT
    sensor_id,
    hourly_readings AS raw,
    arrayFill(x -> (x != 0.0), hourly_readings) AS forward_filled
FROM sensor_logs;
-- sensor 1: [20.1, 20.1, 20.1, 22.5, 22.5, 23.1, 23.1, 23.1]
-- sensor 2: [0.0, 0.0, 15.5, 16.0, 16.0, 16.0, 14.8, 15.1]
--           Note: leading zeros with no prior value stay as 0.0

-- Backward-fill: propagate next known reading backward
SELECT
    sensor_id,
    hourly_readings AS raw,
    arrayReverseFill(x -> (x != 0.0), hourly_readings) AS backward_filled
FROM sensor_logs;
-- sensor 2: [15.5, 15.5, 15.5, 16.0, 14.8, 14.8, 14.8, 15.1]
--           Leading zeros filled from first valid value to the right
```

## Combining Forward-Fill and Backward-Fill

To handle leading gaps (no prior value for forward-fill) and trailing gaps (no next value for backward-fill), chain both operations. Apply forward-fill first to carry values into interior and trailing gaps, then backward-fill to handle any remaining leading gaps:

```sql
-- Two-pass fill: forward-fill first to handle interior/trailing gaps,
-- then backward-fill to handle any leading gaps
SELECT
    sensor_id,
    arrayReverseFill(
        x -> (x != 0.0),
        arrayFill(
            x -> (x != 0.0),
            hourly_readings
        )
    ) AS fully_filled
FROM sensor_logs;
-- sensor 2: [15.5, 15.5, 15.5, 16.0, 16.0, 16.0, 14.8, 15.1]
-- All zeros are now filled
```

## Using Parallel Arrays as Fill Conditions

When you have separate value and validity arrays, pass both to `arrayFill` - the lambda receives elements from both arrays simultaneously:

```sql
-- fill_flags: 1 = valid reading, 0 = sensor error (fill needed)
SELECT arrayFill(
    (val, is_valid) -> (is_valid = 1),
    [10.0, 99.9, 99.9, 14.0, 99.9],  -- 99.9 = error sentinel in values
    [1, 0, 0, 1, 0]                   -- validity flags
) AS filled_by_flag;
-- Result: [10.0, 10.0, 10.0, 14.0, 14.0]
```

## Forward-Fill for Sparse Event Arrays

Forward-fill is also useful for propagating categorical state through a timeline:

```sql
-- Status array where NULL means "no change from previous status"
SELECT arrayFill(
    x -> (x != ''),
    ['active', '', '', 'paused', '', 'active', '']
) AS status_timeline;
-- Result: ['active','active','active','paused','paused','active','active']
```

## Summary

`arrayFill` propagates values left-to-right, replacing positions where the lambda returns 0 with the most recent value where the lambda returned 1 (forward-fill). `arrayReverseFill` does the same from right to left (backward-fill). Together they implement the two standard missing value imputation strategies for ordered sequences: carry-forward and carry-backward. For arrays with leading gaps, chain `arrayFill` inside `arrayReverseFill` for a complete two-pass fill.
