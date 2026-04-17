# How to Use arraySplit() and arrayReverseSplit() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arraySplit, arrayReverseSplit, Session Analysis

Description: Learn how arraySplit() and arrayReverseSplit() divide ClickHouse arrays into sub-arrays at positions defined by a lambda, enabling session detection and array chunking.

---

Splitting an array into sub-arrays at dynamic positions is essential for session analysis, chunking event streams, and segmenting time-series data. `arraySplit` divides an array wherever a lambda condition returns 1, while `arrayReverseSplit` does the same from right to left. The result is an array of arrays, ready for further per-segment analysis.

## Function Signatures

```text
arraySplit(func, arr1 [, arr2, ...])        -> Array(Array(T))
arrayReverseSplit(func, arr1 [, arr2, ...]) -> Array(Array(T))
```

The lambda `func` receives the element at the current index from each input array and returns 1 to start a new sub-array **before** the current element, or 0 to include the current element in the current sub-array. The element where the lambda returns 1 becomes the **first element of the new sub-array** - it is not discarded. The first element of the source array never triggers a split (for `arrayReverseSplit`, the last element never triggers).

## Basic Usage

```sql
-- Split at every even number (start new chunk before each even number)
SELECT arraySplit(x -> (x % 2 = 0), [1, 3, 2, 4, 5, 7, 6]) AS chunks;
-- x=1: first element (no split), x=3: 0, x=2: 1 (split!), x=4: 1 (split!),
-- x=5: 0, x=7: 0, x=6: 1 (split!)
-- Result: [[1,3],[2],[4,5,7],[6]]

-- Split at every position where value decreases (start new ascending run).
-- arrayDifference returns adjacent differences; split when diff < 0.
SELECT arraySplit(
    (v, diff) -> (diff < 0),
    [1, 3, 5, 2, 4, 6, 1, 3],
    arrayDifference([1, 3, 5, 2, 4, 6, 1, 3])
) AS runs;
-- arrayDifference: [0, 2, 2, -3, 2, 2, -5, 2]
-- Result: [[1,3,5],[2,4,6],[1,3]]  (each ascending run is one sub-array)
```

Note: when multiple arrays are passed, the lambda receives one element from each array at the **same index** - it does not receive the current and previous element of a single array. To compare against the previous element, pass a helper array (such as `arrayDifference(arr)`) as an additional argument.

## Sessionizing an Event Stream

The most valuable application of `arraySplit` is detecting session boundaries in a time-ordered event array. A new session starts when the gap between consecutive timestamps exceeds a threshold:

```sql
CREATE TABLE user_clickstreams
(
    user_id UInt32,
    -- Unix timestamps of events in seconds
    event_times Array(UInt32),
    event_pages Array(String)
) ENGINE = Memory;

INSERT INTO user_clickstreams VALUES
    (1,
     [1700000000, 1700000060, 1700000120,  -- session 1 (2 min apart)
      1700003700,                           -- gap > 30 min -> session 2
      1700003760, 1700003840],             -- session 2 continues
     ['home', 'about', 'pricing', 'home', 'checkout', 'confirm']),
    (2,
     [1700010000, 1700010300, 1700014000], -- two sessions
     ['blog', 'post', 'home']);

-- Split timestamps into sessions (new session if gap > 1800 seconds = 30 min).
-- arrayDifference produces the gap between consecutive timestamps (first = 0).
SELECT
    user_id,
    arraySplit(
        (t, gap) -> (gap > 1800),
        event_times,
        arrayDifference(event_times)
    ) AS sessions
FROM user_clickstreams;
-- user 1: [[1700000000,1700000060,1700000120],[1700003700,1700003760,1700003840]]
-- user 2: [[1700010000,1700010300],[1700014000]]

-- Count sessions per user
SELECT
    user_id,
    length(arraySplit(
        (t, gap) -> (gap > 1800),
        event_times,
        arrayDifference(event_times)
    )) AS num_sessions
FROM user_clickstreams;
```

## Splitting Pages Into Sessions Simultaneously

Use the page array as the source and pass the time-derived gap as a condition array so pages split at the same positions as the times:

```sql
-- Split both timestamps and pages using the time-based session boundary.
-- The output always splits the FIRST (source) array; additional arrays only
-- provide values to the lambda.
SELECT
    user_id,
    arraySplit(
        (t, gap) -> (gap > 1800),
        event_times,
        arrayDifference(event_times)
    ) AS session_times,
    arraySplit(
        (page, gap) -> (gap > 1800),
        event_pages,
        arrayDifference(event_times)
    ) AS session_pages
FROM user_clickstreams;
```

Note: in `arraySplit(func, arr1, arr2, ...)`, the lambda receives one element from each array at the same index. The output is the split of the **first** (source) array - the additional arrays only contribute values to the lambda.

## Chunking Arrays into Fixed-Size Blocks

Split an array into chunks of exactly N elements using a counter:

```sql
-- Split [1..10] into chunks of 3 using arrayEnumerate
SELECT arraySplit(
    (val, idx) -> (idx % 3 = 1 AND idx != 1),
    range(1, 11),        -- values
    range(1, 11)         -- indices (same here for simplicity)
) AS chunked;
-- Split starts at positions 4, 7, 10 (every 3rd starting from 4)
-- Result: [[1,2,3],[4,5,6],[7,8,9],[10]]
```

A cleaner approach for fixed-size chunking uses `arrayEnumerate`:

```sql
WITH [10, 20, 30, 40, 50, 60, 70, 80, 90] AS arr
SELECT arraySplit(
    (v, i) -> (i % 3 = 1 AND i > 1),
    arr,
    arrayEnumerate(arr)
) AS chunks_of_3;
-- Result: [[10,20,30],[40,50,60],[70,80,90]]
```

## arrayReverseSplit - Splitting from Right to Left

`arrayReverseSplit` applies the same idea but the split happens to the **right** of the triggering element (that element becomes the last in its sub-array). The last element of the source array never triggers a split. This is useful when you want to close a sub-array immediately after a boundary event rather than opening a new one before it:

```sql
-- Close the current chunk AFTER each even number
SELECT arrayReverseSplit(x -> (x % 2 = 0), [1, 3, 2, 4, 5, 7, 6]) AS reverse_chunks;
-- Triggers (x%2=0) at values 2, 4, 6; the last element (6) never triggers.
-- Splits land to the right of 2 and 4: [1,3,2] | [4] | [5,7,6]
-- Result: [[1,3,2],[4],[5,7,6]]

-- Count elements in the last session (most recent)
WITH arraySplit(
    (t, gap) -> (gap > 1800),
    event_times,
    arrayDifference(event_times)
) AS sessions
SELECT
    user_id,
    length(sessions[length(sessions)]) AS last_session_events
FROM user_clickstreams;
```

## Analyzing Per-Session Statistics

After splitting into sessions, apply `arrayReduce` or `arrayMap` to each session sub-array:

```sql
WITH arraySplit(
    (t, gap) -> (gap > 1800),
    event_times,
    arrayDifference(event_times)
) AS sessions
SELECT
    user_id,
    length(sessions) AS num_sessions,
    arrayMap(s -> length(s), sessions) AS events_per_session,
    arrayMap(
        s -> s[length(s)] - s[1],
        sessions
    ) AS session_durations_seconds
FROM user_clickstreams;
-- user 1: 2 sessions, [3,3] events each, [120, 140] second durations
-- user 2: 2 sessions, [2,1] events each, [300, 0] second durations
```

## Summary

`arraySplit` and `arrayReverseSplit` divide arrays into sub-arrays at positions where a lambda returns 1, returning `Array(Array(T))`. The triggering element is not discarded: with `arraySplit` it becomes the first element of the new sub-array, and with `arrayReverseSplit` it becomes the last element of its sub-array. The lambda receives one element from each passed array at the same index, so comparisons against the previous element are done by pairing the source array with a helper like `arrayDifference`. These functions are the primary tool for sessionizing event streams by time gaps, chunking arrays into fixed-size blocks, and segmenting ordered sequences by any condition. After splitting, per-session metrics can be computed by mapping `arrayReduce`, `length`, or other functions over the resulting array of sub-arrays.
