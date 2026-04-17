# How to Use arrayPopBack() and arrayPopFront() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayPopBack, arrayPopFront

Description: Learn how arrayPopBack() and arrayPopFront() remove the last or first element from a ClickHouse array, enabling queue and stack operations and boundary element trimming.

---

When working with arrays in ClickHouse, you often need to remove an element from either end - dropping the oldest entry in a queue, popping the top of a stack, or trimming a boundary value added during processing. `arrayPopBack` and `arrayPopFront` do this cleanly by returning a new array with the last or first element removed respectively.

## Function Signatures

```text
arrayPopBack(arr)  -> Array(T)
arrayPopFront(arr) -> Array(T)
```

Both return a new array one element shorter. Calling either function on an empty array returns an empty array - no error is raised.

## Basic Usage

```sql
-- Remove the last element
SELECT arrayPopBack([1, 2, 3, 4, 5]) AS without_last;
-- Result: [1, 2, 3, 4]

-- Remove the first element
SELECT arrayPopFront([1, 2, 3, 4, 5]) AS without_first;
-- Result: [2, 3, 4, 5]

-- Pop from a single-element array
SELECT arrayPopBack([42]) AS empty_result;
-- Result: []

-- Pop from empty array - returns empty safely
SELECT arrayPopBack([]) AS still_empty;
-- Result: []

-- String arrays work the same way
SELECT arrayPopFront(['alpha', 'beta', 'gamma']) AS dropped_first;
-- Result: ['beta', 'gamma']
```

## Stack (LIFO) Operations

In a last-in, first-out stack pattern, new items are added with `arrayPushBack` and removed with `arrayPopBack`. The last pushed item is always the first popped:

```sql
CREATE TABLE call_stacks
(
    thread_id UInt32,
    frames Array(String)
) ENGINE = MergeTree()
ORDER BY thread_id;

INSERT INTO call_stacks VALUES
    (1, ['main', 'processRequest', 'parseJSON', 'allocBuffer']),
    (2, ['main', 'handleEvent']);

-- Peek at the top of the stack (most recently pushed frame)
SELECT
    thread_id,
    frames[length(frames)] AS top_frame
FROM call_stacks;

-- Pop the top frame (return from allocBuffer)
ALTER TABLE call_stacks
UPDATE frames = arrayPopBack(frames)
WHERE thread_id = 1;

-- thread 1 frames after pop: ['main', 'processRequest', 'parseJSON']
```

## Queue (FIFO) Operations

In a first-in, first-out queue pattern, items are enqueued at the back with `arrayPushBack` and dequeued from the front with `arrayPopFront`:

```sql
CREATE TABLE task_queues
(
    worker_id UInt32,
    pending_tasks Array(String)
) ENGINE = MergeTree()
ORDER BY worker_id;

INSERT INTO task_queues VALUES
    (1, ['task_001', 'task_002', 'task_003']),
    (2, ['task_010']);

-- Peek at the next task to process
SELECT
    worker_id,
    pending_tasks[1] AS next_task
FROM task_queues;

-- Dequeue the first task (mark it as processed and remove)
ALTER TABLE task_queues
UPDATE pending_tasks = arrayPopFront(pending_tasks)
WHERE worker_id = 1;

-- worker 1 after dequeue: ['task_002', 'task_003']
```

## Removing Sentinel Values

It is common to add sentinel or boundary values at the edges of an array before processing, then remove them afterward. `arrayPopBack` and `arrayPopFront` make cleanup straightforward:

```sql
-- Add 0 at front for arrayDifference to start from zero, then pop it off the result
SELECT arrayPopFront(
    arrayDifference(arrayPushFront([10, 25, 40, 55], 0))
) AS deltas;
-- arrayDifference with leading 0: [0, 10, 15, 15, 15]
-- After popFront to remove leading 0: [10, 15, 15, 15]
```

## Comparing Pop with arraySlice

`arrayPopBack` is equivalent to `arraySlice(arr, 1, length(arr) - 1)` and `arrayPopFront` is equivalent to `arraySlice(arr, 2)`. The pop functions are more readable for single-element removal:

```sql
-- These are equivalent
SELECT arrayPopFront([1, 2, 3, 4]) AS pop_way;
SELECT arraySlice([1, 2, 3, 4], 2) AS slice_way;
-- Both: [2, 3, 4]

-- Pop is cleaner when you just want to drop one end
SELECT arrayPopBack([1, 2, 3, 4]) AS pop_back_way;
SELECT arraySlice([1, 2, 3, 4], 1, length([1, 2, 3, 4]) - 1) AS slice_back_way;
-- Both: [1, 2, 3]
```

## Chaining Pops to Remove Multiple Elements

To drop multiple elements from either end, chain the pop calls. For removing more than two or three elements, `arraySlice` is more concise:

```sql
-- Remove the last 2 elements
SELECT arrayPopBack(arrayPopBack([1, 2, 3, 4, 5])) AS drop_last_2;
-- Result: [1, 2, 3]

-- Remove the first 2 elements
SELECT arrayPopFront(arrayPopFront([1, 2, 3, 4, 5])) AS drop_first_2;
-- Result: [3, 4, 5]

-- Equivalent with arraySlice (preferred for larger counts)
SELECT arraySlice([1, 2, 3, 4, 5], 3) AS slice_equivalent;
-- Result: [3, 4, 5]
```

## Maintaining a Fixed-Size Queue

Combine `arrayPushBack` (enqueue) and `arrayPopFront` (dequeue) to maintain a sliding window of the last N events:

```sql
-- Starting queue of size 3
-- Enqueue new item and drop oldest to maintain max size 3
SELECT
    arrayPopFront(
        arrayPushBack(['a', 'b', 'c'], 'd')
    ) AS sliding_window;
-- Enqueued 'd', dequeued 'a': ['b', 'c', 'd']
```

In practice with ALTER UPDATE:

```sql
ALTER TABLE task_queues
UPDATE pending_tasks = arrayPopFront(arrayPushBack(pending_tasks, 'task_new'))
WHERE worker_id = 1 AND length(pending_tasks) >= 5;
```

## Summary

`arrayPopBack` and `arrayPopFront` are the complement to `arrayPushBack` and `arrayPushFront`, enabling complete stack and queue semantics on ClickHouse array columns. They remove one element from the appropriate end and return a new array. For stack operations use `arrayPushBack` plus `arrayPopBack`; for queue operations use `arrayPushBack` plus `arrayPopFront`. They are also useful for cleaning up sentinel values added at array boundaries before or after processing steps.
