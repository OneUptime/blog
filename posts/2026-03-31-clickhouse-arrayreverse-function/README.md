# How to Use arrayReverse() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayReverse, Sorting

Description: Learn how arrayReverse() flips the order of elements in a ClickHouse array, enabling last-element access, LIFO structures, and reverse-sorted array analysis.

---

Sometimes you need array elements in the opposite order - whether to access the most recent event first, reverse a sorted ranking, or build a LIFO (last-in, first-out) traversal pattern. ClickHouse's `arrayReverse` function does exactly this: it returns a new array with all elements in reversed order, leaving the original unchanged.

## Function Signature

```text
arrayReverse(arr) -> Array(T)
```

The returned array has the same type and length as the input. The function is purely positional - it does not sort; it reverses.

## Basic Reversal

```sql
-- Reverse a numeric array
SELECT arrayReverse([1, 2, 3, 4, 5]) AS reversed;
-- Result: [5, 4, 3, 2, 1]

-- Reverse a string array
SELECT arrayReverse(['a', 'b', 'c']) AS reversed_str;
-- Result: ['c', 'b', 'a']

-- Reverse a single-element array (no change)
SELECT arrayReverse([42]) AS single;
-- Result: [42]

-- Reverse an empty array
SELECT arrayReverse([]) AS empty;
-- Result: []
```

## Accessing the Last Element Without length()

When you want to read the last or second-to-last element of an array, reversing and then indexing from the front is often more readable than computing `arr[length(arr)]`:

```sql
CREATE TABLE events
(
    user_id UInt32,
    timestamps Array(DateTime)
) ENGINE = Memory;

INSERT INTO events VALUES
    (1, ['2024-01-01 10:00:00', '2024-01-02 11:00:00', '2024-01-03 09:00:00']),
    (2, ['2024-01-05 14:00:00', '2024-01-06 08:30:00']),
    (3, ['2024-02-01 12:00:00']);

-- Get the most recent timestamp (last element) using reverse + index 1
SELECT
    user_id,
    arrayReverse(timestamps)[1] AS most_recent
FROM events;

-- Get the second most recent
SELECT
    user_id,
    arrayReverse(timestamps)[2] AS second_most_recent
FROM events;
```

## Reversing a Sorted Array

`arrayReverse` combined with `arraySort` gives you a descending sort of array elements without a custom comparator:

```sql
-- Sort ascending then reverse for descending order
SELECT
    arraySort([3, 1, 4, 1, 5, 9, 2, 6]) AS asc_sorted,
    arrayReverse(arraySort([3, 1, 4, 1, 5, 9, 2, 6])) AS desc_sorted;
-- asc_sorted:  [1, 1, 2, 3, 4, 5, 6, 9]
-- desc_sorted: [9, 6, 5, 4, 3, 2, 1, 1]
```

For more complex sorting with a lambda, `arrayReverseSort` is even more convenient as it combines both operations:

```sql
-- arrayReverseSort is equivalent to arrayReverse(arraySort(...))
SELECT arrayReverseSort(x -> x, [3, 1, 4, 1, 5]) AS desc_lambda;
-- Result: [5, 4, 3, 1, 1]
```

## LIFO Traversal Pattern

In a last-in, first-out (LIFO) pattern, new items are appended to the end of the array but processed from the newest to oldest. Reversing before unnesting achieves this traversal order:

```sql
CREATE TABLE task_queue
(
    queue_id UInt32,
    task_names Array(String)
) ENGINE = Memory;

INSERT INTO task_queue VALUES
    (1, ['setup', 'build', 'test', 'deploy']),
    (2, ['init', 'validate']);

-- Process tasks LIFO: most recently added task first
SELECT
    queue_id,
    task,
    idx AS lifo_order
FROM (
    SELECT
        queue_id,
        arrayReverse(task_names) AS reversed_tasks
    FROM task_queue
)
ARRAY JOIN
    reversed_tasks AS task,
    arrayEnumerate(reversed_tasks) AS idx;
-- queue 1: deploy(1), test(2), build(3), setup(4)
-- queue 2: validate(1), init(2)
```

## Comparing Original and Reversed Arrays

Use `arrayReverse` to check whether an array is a palindrome - equal to its own reverse:

```sql
SELECT
    arr,
    (arr = arrayReverse(arr)) AS is_palindrome
FROM (
    SELECT [1, 2, 3, 2, 1] AS arr
    UNION ALL SELECT [1, 2, 3]
    UNION ALL SELECT [7, 7, 7]
);
-- [1,2,3,2,1]  1  (palindrome)
-- [1,2,3]      0
-- [7,7,7]      1  (palindrome)
```

## Reversing Cumulative Arrays

When you have an array of cumulative values and want to compute deltas from the most recent point backward, reversing before applying `arrayDifference` provides the reversed delta sequence:

```sql
-- Cumulative event counts over time
SELECT
    arrayDifference(arrayReverse([100, 95, 80, 60, 30, 10])) AS reverse_deltas;
-- Reversed input: [10, 30, 60, 80, 95, 100]
-- Deltas:         [0, 20, 30, 20, 15, 5]
-- Shows: each step gained 20, 30, 20, 15, 5 events going backward in time
```

## Combining with arraySlice

Reverse first, then slice to get a trailing window in reverse order - useful for showing the N most recent items newest-first:

```sql
SELECT
    user_id,
    -- Last 3 events, most recent first
    arraySlice(arrayReverse(timestamps), 1, 3) AS last_3_newest_first
FROM events;
```

## Summary

`arrayReverse` is a simple but versatile function that returns an array with element order flipped. Its primary uses are accessing elements from the end without computing lengths, creating descending-sorted arrays from ascending sorts, implementing LIFO traversal patterns, and checking for palindromes. Combining it with `arraySlice`, `arraySort`, and `ARRAY JOIN` covers the vast majority of reverse-order array operations in ClickHouse analytics.
