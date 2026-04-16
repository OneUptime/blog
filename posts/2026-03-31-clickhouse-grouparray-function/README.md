# How to Use groupArray() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, GroupArray, Array

Description: Learn how to use groupArray() and groupArray(N)() in ClickHouse to collect column values into arrays, with sorting, deduplication, and memory usage tips.

---

`groupArray(column)` is a ClickHouse aggregate function that collects all values of a column within a group into an array. It is the building block for many array-based analytics patterns: collecting event sequences, building histograms, assembling per-user activity timelines, and feeding arrays into further array functions. This post covers the core usage, the size-limited variant, and how to combine `groupArray` with `arraySort`, `arrayDistinct`, and other array functions.

## Basic groupArray()

`groupArray(column)` returns an `Array(T)` containing all values from the column across the rows in each group, in an unspecified order.

```sql
CREATE TABLE user_actions
(
    user_id    UInt64,
    action     String,
    page       String,
    action_time DateTime
)
ENGINE = MergeTree()
ORDER BY (action_time, user_id);

INSERT INTO user_actions VALUES
    (1, 'view',     '/home',     '2026-03-31 10:00:00'),
    (1, 'click',    '/product',  '2026-03-31 10:01:00'),
    (1, 'purchase', '/checkout', '2026-03-31 10:05:00'),
    (2, 'view',     '/home',     '2026-03-31 10:02:00'),
    (2, 'view',     '/about',    '2026-03-31 10:03:00');

-- Collect all actions per user into an array
SELECT
    user_id,
    groupArray(action) AS actions
FROM user_actions
GROUP BY user_id;
```

Output:
```text
user_id | actions
--------|------------------------------------------
1       | ['view', 'click', 'purchase']
2       | ['view', 'view']
```

## groupArray(N)(column) - Limit Array Size

`groupArray(N)(column)` collects at most `N` elements. Once `N` elements are accumulated, additional rows in the group are discarded. This is useful for capping memory usage or building "top N" sample lists.

```sql
-- Collect up to 5 recent pages per user
SELECT
    user_id,
    groupArray(5)(page) AS sample_pages
FROM user_actions
GROUP BY user_id;
```

The `N` elements selected are the first `N` encountered during processing - not necessarily the first `N` by time. ClickHouse does not guarantee that an inner `ORDER BY` is preserved through an outer `GROUP BY` (especially with parallel or distributed aggregation), so the reliable way to get the most recent `N` is to collect tuples and sort the resulting array:

```sql
-- Get the 3 most recent actions per user (reliable tuple-based approach)
SELECT
    user_id,
    arrayMap(
        x -> x.2,
        arraySlice(arrayReverseSort(groupArray((action_time, action))), 1, 3)
    ) AS recent_actions
FROM user_actions
GROUP BY user_id;
```

## Sorting the Array with arraySort

`groupArray` does not guarantee element order. Use `arraySort` to sort the resulting array, or collect `(action_time, action)` tuples to preserve order.

```sql
-- Collect actions in chronological order using tuple collection + sort
SELECT
    user_id,
    arrayMap(x -> x.2, arraySort(groupArray((action_time, action)))) AS ordered_actions
FROM user_actions
GROUP BY user_id;
```

Alternatively, if you only need the values in sorted order and the key is a simple comparable:

```sql
SELECT
    user_id,
    arraySort(groupArray(action)) AS sorted_actions
FROM user_actions
GROUP BY user_id;
```

## Removing Duplicates with arrayDistinct

Combine `groupArray` with `arrayDistinct` to get a unique list of values per group:

```sql
-- Unique pages visited per user
SELECT
    user_id,
    arrayDistinct(groupArray(page)) AS unique_pages
FROM user_actions
GROUP BY user_id;
```

Note: for collecting only unique values, `groupUniqArray()` is more efficient because it deduplicates during aggregation rather than after.

## Building Histograms and Frequency Arrays

```sql
CREATE TABLE page_views
(
    page     String,
    view_date Date,
    views    UInt32
)
ENGINE = MergeTree()
ORDER BY (view_date, page);

-- Collect daily view counts per page into an array for sparkline charts
SELECT
    page,
    groupArray(view_date) AS dates,
    groupArray(views)     AS view_counts
FROM (
    SELECT page, view_date, sum(views) AS views
    FROM page_views
    GROUP BY page, view_date
    ORDER BY page, view_date
)
GROUP BY page;
```

## Memory Usage Considerations

`groupArray` accumulates all values in memory per group. For high-cardinality groups or large datasets, this can consume significant RAM. Strategies to manage memory:

- Use `groupArray(N)()` to cap the array size
- Filter rows before aggregation with `WHERE` or by using `groupArrayIf` (available via `groupArrayIf(col, condition)`)
- Monitor query memory usage with `system.query_log`

```sql
-- Monitor memory used by a groupArray query
SELECT
    query_id,
    formatReadableSize(memory_usage) AS memory,
    query
FROM system.query_log
WHERE query LIKE '%groupArray%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Combining groupArray with arrayJoin

`arrayJoin` is the inverse of `groupArray` - it expands an array back into rows. Together they enable powerful reshape operations:

```sql
-- Round-trip: aggregate into array, then expand back
SELECT user_id, arrayJoin(groupArray(action)) AS action
FROM user_actions
GROUP BY user_id;
```

This is most useful when you need to apply array functions (like `arraySort`, `arraySlice`, `arrayFilter`) in the middle of a pipeline before expanding again.

## Summary

`groupArray(col)` collects all column values within a group into an array. Use `groupArray(N)(col)` to cap the result size and control memory usage. Combine with `arraySort` to order elements, `arrayDistinct` to deduplicate, and `arrayJoin` to expand arrays back into rows. For collecting unique values directly, prefer `groupUniqArray()` as it deduplicates during aggregation rather than afterwards.
