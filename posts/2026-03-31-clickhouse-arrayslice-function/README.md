# How to Use arraySlice() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arraySlice, Pagination, Window

Description: Learn how arraySlice() extracts sub-arrays in ClickHouse using 1-based or negative offsets, enabling array pagination, windowing, and last-N element access patterns.

---

Extracting a portion of an array is one of the most common array operations in analytics. ClickHouse's `arraySlice` function works similarly to Python's list slicing: you specify a starting offset and an optional length, and get back a contiguous sub-array. Negative offsets count from the end of the array, making it easy to grab the last N elements without knowing the array length upfront.

## Function Signature

```text
arraySlice(arr, offset [, length])
```

- `arr` - the source array
- `offset` - 1-based starting position; negative values count from the end (-1 is the last element)
- `length` - optional number of elements to return; if omitted, returns all elements from offset to the end

## Basic Usage

The offset is 1-based, unlike the 0-based indexing you may be used to from Python or JavaScript:

```sql
-- Slice starting at position 2, taking 3 elements
SELECT arraySlice([10, 20, 30, 40, 50], 2, 3) AS sliced;
-- Result: [20, 30, 40]

-- Slice to the end from position 3
SELECT arraySlice([10, 20, 30, 40, 50], 3) AS from_third;
-- Result: [30, 40, 50]

-- Slice with offset beyond array length returns empty array
SELECT arraySlice([1, 2, 3], 10) AS empty_result;
-- Result: []
```

## Negative Offsets - Counting from the End

Negative offsets make it simple to grab a trailing window of elements. `-1` refers to the last element, `-2` to the second-to-last, and so on:

```sql
-- Get the last 3 elements
SELECT arraySlice([10, 20, 30, 40, 50], -3) AS last_3;
-- Result: [30, 40, 50]

-- Get the last 2 elements with explicit length
SELECT arraySlice([10, 20, 30, 40, 50], -2, 2) AS last_2;
-- Result: [40, 50]

-- Get just the last element
SELECT arraySlice([10, 20, 30, 40, 50], -1, 1) AS last_elem;
-- Result: [50]
```

## Paginating Over Stored Arrays

When arrays represent ordered lists like search results or recommendations, `arraySlice` implements pagination logic. You can store the full result set and slice it per page at query time:

```sql
CREATE TABLE search_results
(
    query_id UInt32,
    result_ids Array(UInt32)
) ENGINE = Memory;

INSERT INTO search_results VALUES
    (1, [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]),
    (2, [201, 202, 203]);

-- Page 1: items 1-3 (offset 1, length 3)
SELECT
    query_id,
    arraySlice(result_ids, 1, 3) AS page_1
FROM search_results;

-- Page 2: items 4-6 (offset 4, length 3)
SELECT
    query_id,
    arraySlice(result_ids, 4, 3) AS page_2
FROM search_results;

-- Dynamic page using a parameter (page_number is 1-based)
-- Page 3 of size 3: offset = (3-1)*3 + 1 = 7
SELECT
    query_id,
    arraySlice(result_ids, 7, 3) AS page_3
FROM search_results;
```

## Sliding Window Analysis on Time-Series Arrays

`arraySlice` combined with `arrayDifference` or `arrayReduce` lets you analyze windows within stored time-series arrays. Here the offset advances with each step to build a moving sum:

```sql
CREATE TABLE sensor_readings
(
    sensor_id UInt32,
    hourly_temps Array(Float32)
) ENGINE = Memory;

INSERT INTO sensor_readings VALUES
    (1, [20.1, 21.3, 19.8, 22.5, 23.1, 21.7, 20.9, 22.3]);

-- Compute a 3-element moving sum for windows starting at positions 1, 2, 3
SELECT
    sensor_id,
    arrayReduce('sum', arraySlice(hourly_temps, 1, 3)) AS window_1_sum,
    arrayReduce('sum', arraySlice(hourly_temps, 2, 3)) AS window_2_sum,
    arrayReduce('sum', arraySlice(hourly_temps, 3, 3)) AS window_3_sum
FROM sensor_readings;
```

## Extracting the Most Recent N Events

A very common pattern in user analytics is fetching only the most recent events from an array that grows over time. Using a negative offset avoids needing to know the total array length:

```sql
CREATE TABLE user_activity
(
    user_id UInt32,
    event_ids Array(UInt32)
) ENGINE = Memory;

INSERT INTO user_activity VALUES
    (1, [1001, 1002, 1003, 1004, 1005, 1006]),
    (2, [2001, 2002]),
    (3, [3001, 3002, 3003, 3004]);

-- Get each user's 3 most recent events
SELECT
    user_id,
    arraySlice(event_ids, -3) AS recent_events
FROM user_activity;
-- user 1: [1004, 1005, 1006]
-- user 2: [2001, 2002]        (array is shorter than 3, returns all)
-- user 3: [3002, 3003, 3004]
```

## Removing Boundary Elements

`arraySlice` can also trim elements from the start or end of an array. To drop the first element use offset 2; to drop the last element use length set to `length(arr) - 1`:

```sql
-- Drop the first element
SELECT arraySlice([1, 2, 3, 4, 5], 2) AS drop_first;
-- Result: [2, 3, 4, 5]

-- Drop the last element (equivalent to arrayPopBack)
SELECT arraySlice([1, 2, 3, 4, 5], 1, length([1, 2, 3, 4, 5]) - 1) AS drop_last;
-- Result: [1, 2, 3, 4]

-- Drop first 2 and last 2 elements - keeping the middle
SELECT arraySlice([1, 2, 3, 4, 5, 6, 7], 3, 3) AS middle;
-- Result: [3, 4, 5]
```

## Combining with ARRAY JOIN for Row-Level Windowing

After slicing, you can unnest the result to get individual rows for further analysis:

```sql
SELECT
    sensor_id,
    reading
FROM (
    SELECT
        sensor_id,
        -- Take only the 4 most recent readings
        arraySlice(hourly_temps, -4) AS recent_temps
    FROM sensor_readings
)
ARRAY JOIN recent_temps AS reading;
```

## Summary

`arraySlice` provides Python-style sub-array extraction with 1-based positive offsets and negative offsets that count from the end. It is the core tool for array pagination, windowing, trimming, and extracting trailing elements. When combined with `arrayReduce`, `arrayDifference`, or `ARRAY JOIN`, it enables rich time-series and sequence analytics directly on stored array columns without unnesting the full array first.
