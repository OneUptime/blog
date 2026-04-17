# How to Use arrayCompact() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayCompact, Run-Length Encoding, Deduplication

Description: Learn how arrayCompact() removes consecutive duplicate elements from ClickHouse arrays, enabling run-length compression and adjacent event deduplication in time-series data.

---

When arrays contain consecutive repeated values - like a sensor that reports the same reading multiple times, or a status field that stays at "error" across several consecutive events - you often want to deduplicate adjacent duplicates while preserving the sequence structure. `arrayCompact` does this efficiently: it removes consecutive duplicates while keeping non-adjacent repeats intact.

## Function Signature

```text
arrayCompact(arr) -> Array(T)
```

The result array contains only the first element of each run of identical consecutive values. Non-consecutive duplicates are preserved.

## Basic Usage

```sql
-- Remove consecutive duplicates
SELECT arrayCompact([1, 1, 2, 2, 2, 3, 1, 1]) AS compacted;
-- Result: [1, 2, 3, 1]
-- Note: the final pair of 1s is kept because they are not adjacent to the first 1s

-- String arrays
SELECT arrayCompact(['a', 'a', 'b', 'c', 'c', 'c', 'b']) AS compacted_str;
-- Result: ['a', 'b', 'c', 'b']

-- Already compact array - no change
SELECT arrayCompact([1, 2, 3, 4]) AS no_change;
-- Result: [1, 2, 3, 4]

-- All same value becomes a single element
SELECT arrayCompact([5, 5, 5, 5, 5]) AS single_run;
-- Result: [5]

-- Empty array
SELECT arrayCompact([]) AS empty;
-- Result: []
```

## Compressing Time-Series State Arrays

Sensors and monitoring systems often record state at regular intervals, producing long runs of the same value. `arrayCompact` extracts the state transition sequence:

```sql
CREATE TABLE device_status
(
    device_id UInt32,
    -- Status recorded every minute: 0=ok, 1=degraded, 2=error
    status_timeline Array(UInt8)
) ENGINE = Memory;

INSERT INTO device_status VALUES
    (1, [0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 0, 0, 0]),
    (2, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    (3, [0, 1, 0, 1, 0, 1]);

-- Extract just the state transition sequence
SELECT
    device_id,
    status_timeline,
    arrayCompact(status_timeline) AS transitions
FROM device_status;
-- device 1: [0,1,2,1,0]   (5-entry transition sequence)
-- device 2: [0]            (was always ok)
-- device 3: [0,1,0,1,0,1] (alternating, no consecutive dups)

-- Count distinct state transitions per device
SELECT
    device_id,
    length(arrayCompact(status_timeline)) - 1 AS num_transitions
FROM device_status;
-- device 1: 4 transitions
-- device 2: 0 transitions
-- device 3: 5 transitions
```

## Deduplicating Adjacent Log Events

Application logs often contain bursts of the same error event. Compacting removes the noise while preserving the ordered sequence of distinct error types:

```sql
CREATE TABLE service_logs
(
    service_name String,
    error_codes Array(String)
) ENGINE = Memory;

INSERT INTO service_logs VALUES
    ('api-server',   ['timeout', 'timeout', 'timeout', '500', '500', 'timeout', '200']),
    ('auth-service', ['200', '401', '401', '403', '200', '200']);

-- Get deduplicated error sequence
SELECT
    service_name,
    arrayCompact(error_codes) AS deduped_sequence
FROM service_logs;
-- api-server:   ['timeout','500','timeout','200']
-- auth-service: ['200','401','403','200']

-- Count how many unique events remain after deduplication
SELECT
    service_name,
    length(error_codes) AS raw_count,
    length(arrayCompact(error_codes)) AS deduped_count
FROM service_logs;
```

## Implementing Run-Length Encoding

`arrayCompact` is half of run-length encoding (RLE). Pair it with `arrayEnumerateUniq` via a custom approach to compute the run lengths:

```sql
-- Compute run lengths manually using arrayCompact + arrayDifference on indices
SELECT
    arr,
    arrayCompact(arr) AS values,
    -- Run lengths: find where changes occur
    arrayMap(
        (v, i) -> v,
        arrayCompact([1, 1, 2, 2, 2, 3, 1, 1]),
        [1, 2, 3, 4]
    ) AS placeholder
FROM (SELECT [1, 1, 2, 2, 2, 3, 1, 1] AS arr);

-- Simpler: just report compacted values alongside original length
SELECT
    length([1, 1, 2, 2, 2, 3, 1, 1]) AS original_len,
    length(arrayCompact([1, 1, 2, 2, 2, 3, 1, 1])) AS compressed_len;
-- original_len: 8, compressed_len: 4 (50% reduction)
```

## Checking for State Stability

A device whose compacted array has a single element never changed state - all readings were identical. Checking the length of the compacted array is a quick way to detect perfectly stable metrics:

```sql
SELECT
    device_id,
    (length(arrayCompact(status_timeline)) = 1) AS is_stable
FROM device_status;
-- device 1: 0 (not stable, had transitions)
-- device 2: 1 (stable, always 0)
-- device 3: 0 (not stable, alternated)
```

## Combining with arrayJoin for Transition Analysis

After compacting, unnest the transition sequence to analyze state durations or count transitions:

```sql
SELECT
    device_id,
    status,
    count() AS times_entered_this_state
FROM (
    SELECT
        device_id,
        arrayCompact(status_timeline) AS transitions
    FROM device_status
)
ARRAY JOIN transitions AS status
GROUP BY device_id, status
ORDER BY device_id, status;
```

## Summary

`arrayCompact` removes consecutive duplicate elements from an array, keeping only the first element of each run. This is the core operation for state transition extraction, adjacent event deduplication, and the value half of run-length encoding. Unlike `arrayDistinct`, it preserves non-adjacent repeats and maintains array order. It is particularly valuable for time-series arrays where consecutive identical values represent stable states rather than unique events.
