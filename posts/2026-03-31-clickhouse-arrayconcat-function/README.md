# How to Use arrayConcat() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayConcat, SQL, Array Merge

Description: Learn how arrayConcat() merges multiple arrays into one, with examples covering column merges, tag combining, and multi-source sequence assembly.

---

`arrayConcat()` is ClickHouse's dedicated function for joining two or more arrays end-to-end into a single array. It accepts any number of array arguments of compatible element types and returns a new array containing all elements in the order the input arrays were provided. Unlike set-based operations, `arrayConcat()` preserves duplicates and maintains element order, making it the right tool whenever you need to combine arrays from multiple columns, merge partial results, or assemble a sequence from several sources.

## Basic Concatenation

The simplest case is concatenating two or three literal arrays.

```sql
-- Join two integer arrays
SELECT arrayConcat([1, 2, 3], [4, 5, 6]) AS combined;
-- Result: [1, 2, 3, 4, 5, 6]

-- Concatenate three string arrays
SELECT arrayConcat(['a', 'b'], ['c', 'd'], ['e', 'f']) AS letters;
-- Result: ['a', 'b', 'c', 'd', 'e', 'f']
```

## Merging Array Columns from the Same Row

When a table has multiple array columns that represent partitioned lists, `arrayConcat()` reassembles them into one.

```sql
-- Combine system_tags and user_tags into a single tag list per record
SELECT
    event_id,
    arrayConcat(system_tags, user_tags) AS all_tags
FROM events;
```

## Appending a Single Element

ClickHouse provides `arrayPushBack()` for appending a single element, but `arrayConcat()` with the new element wrapped in `array()` achieves the same result and generalizes to appending multiple elements at once.

```sql
-- Append 'archived' to the existing status list
SELECT
    record_id,
    arrayConcat(statuses, array('archived')) AS updated_statuses
FROM records;
```

## Prepending Elements

The same approach works for prepending: put the new element array first. ClickHouse also offers `arrayPushFront()` for the single-element case.

```sql
-- Prepend a sentinel value to each trace's span list
SELECT
    trace_id,
    arrayConcat(array('root'), span_ids) AS full_span_ids
FROM traces;
```

## Combining Tags from Multiple Sources

In data pipelines it is common to collect tags from infrastructure, the application, and user input separately. `arrayConcat()` merges them all.

```sql
-- Merge infrastructure, app, and manual tags into one array
SELECT
    log_id,
    arrayConcat(infra_tags, app_tags, manual_tags) AS merged_tags
FROM enriched_logs;
```

## Concatenating Arrays From Different Aggregation Branches

When you aggregate rows with conditional `groupArrayIf()` calls, you can merge the resulting arrays using `arrayConcat()` in the same `SELECT`.

```sql
-- Collect event names per user from two sources, then combine into one array
SELECT
    user_id,
    arrayConcat(
        groupArrayIf(event_name, source = 'web'),
        groupArrayIf(event_name, source = 'mobile')
    ) AS all_user_events
FROM events
GROUP BY user_id;
```

## Using arrayConcat() to Build Lookup Tables Inline

Sometimes you need to construct a known sequence by concatenating domain-specific sub-arrays.

```sql
-- Build a full weekday + weekend list from two sub-arrays
WITH arrayConcat(
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    ['Saturday', 'Sunday']
) AS days_of_week
SELECT days_of_week;
```

## Removing Duplicates After Concatenation

`arrayConcat()` preserves all elements including duplicates. To deduplicate after merging, wrap the result with `arrayDistinct()`.

```sql
-- Merge tag lists and remove duplicates
SELECT
    event_id,
    arrayDistinct(arrayConcat(source_a_tags, source_b_tags)) AS unique_tags
FROM events;
```

## Concatenating with Conditionally Present Arrays

If an array column can be empty, `arrayConcat()` handles that gracefully - concatenating with an empty array is a no-op for that source.

```sql
-- Safely merge optional extra_features (may be empty) with base_features
SELECT
    plan_id,
    arrayConcat(base_features, extra_features) AS all_features
FROM subscription_plans;
```

## Practical Example: Assembling an Ordered Event Timeline

When events from different subsystems are stored in separate array columns but need to be ordered together, concatenate and then sort.

```sql
-- Merge timestamps from two subsystems and sort chronologically
SELECT
    session_id,
    arraySort(arrayConcat(frontend_event_times, backend_event_times)) AS full_timeline
FROM session_data;
```

## Summary

`arrayConcat()` joins any number of arrays into a single ordered array, preserving duplicates and element order. It is the standard way to merge array columns within a row, append or prepend individual elements, or combine arrays produced by different aggregation branches. Pair it with `arrayDistinct()` when uniqueness is required after the merge, and with `arraySort()` when the combined array needs to be ordered.
