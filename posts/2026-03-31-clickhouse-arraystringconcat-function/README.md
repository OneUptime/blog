# How to Use arrayStringConcat() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Array, Aggregation, Analytics

Description: Learn how arrayStringConcat() joins array elements into a delimited string in ClickHouse, the equivalent of GROUP_CONCAT or string_agg in other databases.

---

In many databases, grouping rows and collecting their values into a single comma-separated string requires a special aggregate function like `GROUP_CONCAT` in MySQL or `string_agg` in PostgreSQL. In ClickHouse the same result is achieved in two steps: first use `groupArray()` to collect values into an array within the aggregation, then use `arrayStringConcat()` to join those array elements into a string. This separation gives you full control over sorting, filtering, and deduplication before the final join.

## Function Signature

```text
arrayStringConcat(arr)
arrayStringConcat(arr, separator)
```

When called with only an array argument, the elements are joined with no separator. When a separator string is provided, it is inserted between every pair of adjacent elements. The separator is not appended to the end.

```sql
-- Join without a separator
SELECT arrayStringConcat(['a', 'b', 'c']) AS result;
-- result: 'abc'

-- Join with a comma separator
SELECT arrayStringConcat(['a', 'b', 'c'], ',') AS result;
-- result: 'a,b,c'

-- Join with a multi-character separator
SELECT arrayStringConcat(['alpha', 'beta', 'gamma'], ' | ') AS result;
-- result: 'alpha | beta | gamma'
```

## Collecting Values Per Group

The canonical use case is building a comma-separated list of values grouped by a key. In ClickHouse this is expressed as `arrayStringConcat(groupArray(...), separator)`:

```sql
-- List all event names per user session as a comma-separated string
SELECT
    session_id,
    arrayStringConcat(groupArray(event_name), ', ') AS event_sequence
FROM events
GROUP BY session_id
ORDER BY session_id
LIMIT 10;
```

```sql
-- Collect all unique tags per article
SELECT
    article_id,
    arrayStringConcat(groupUniqArray(tag), ', ') AS unique_tags
FROM article_tags
GROUP BY article_id
ORDER BY article_id
LIMIT 10;
```

`groupUniqArray()` deduplicates elements before building the array, ensuring each tag appears only once in the resulting string.

## Controlling Order Before Joining

`groupArray()` does not guarantee insertion order. To produce a deterministically ordered string, use `arraySort()` or `arrayReverseSort()` on the array before passing it to `arrayStringConcat()`:

```sql
-- Sorted list of product categories per order
SELECT
    order_id,
    arrayStringConcat(arraySort(groupArray(category)), ', ') AS sorted_categories
FROM order_items
GROUP BY order_id
LIMIT 10;
```

```sql
-- Ordered event trace: most recent event last
SELECT
    session_id,
    arrayStringConcat(
        groupArray(event_name) -- order is determined by the query sort within the group
    , ' -> ') AS event_trace
FROM (
    SELECT session_id, event_name
    FROM events
    ORDER BY session_id, event_timestamp ASC
)
GROUP BY session_id
LIMIT 10;
```

Note: to guarantee per-group order by a timestamp, use `groupArraySorted(N)(x)` (available in mainline ClickHouse since 24.2) to get the first N items in ascending order, or pre-sort in a subquery and rely on the narrow exception that `groupArray` may preserve order when the subquery result is small enough.

## Formatting SQL or Configuration Snippets

`arrayStringConcat()` is useful for generating multi-value SQL clauses or configuration strings dynamically:

```sql
-- Generate an IN-list string from a set of IDs
SELECT
    '(' || arrayStringConcat(groupArray(toString(user_id)), ', ') || ')'
        AS in_clause
FROM vip_users;
-- result: '(101, 205, 308, 412)'
```

```sql
-- Build a comma-separated SELECT column list from a schema table
SELECT
    table_name,
    arrayStringConcat(groupArray(column_name), ', ') AS column_list
FROM system.columns
WHERE database = 'default'
GROUP BY table_name
ORDER BY table_name
LIMIT 5;
```

## Building Human-Readable Output

When presenting results to end users or writing to a report, joining multiple values into a natural-language list improves readability:

```sql
-- Summarize error types per host in a single readable field
SELECT
    host,
    arrayStringConcat(
        arrayMap(x -> x.1 || ' (' || toString(x.2) || ')',
            arraySort(x -> -x.2,
                groupArray((error_type, count))
            )
        ),
        '; '
    ) AS error_summary
FROM (
    SELECT host, error_type, COUNT(*) AS count
    FROM application_errors
    GROUP BY host, error_type
)
GROUP BY host
ORDER BY host
LIMIT 10;
```

This produces output like `timeout (42); connection_refused (17); oom (3)` for each host.

## Joining Array Columns Directly

`arrayStringConcat()` does not require `groupArray()` - you can call it directly on an array-typed column:

```sql
-- Join a pre-stored array column into a display string
SELECT
    user_id,
    arrayStringConcat(roles, ', ') AS role_list
FROM users
LIMIT 10;
```

```sql
-- Reconstruct a URL path from a stored path-segments array
SELECT
    page_id,
    '/' || arrayStringConcat(
        arrayFilter(x -> x != '', path_segments),
        '/'
    ) AS reconstructed_path
FROM pages
LIMIT 10;
```

## Handling Non-String Array Elements

`arrayStringConcat()` accepts `Array(T)` for any element type and stringifies elements automatically in modern ClickHouse (22.3+), so `arrayStringConcat([1, 2, 3], ',')` returns `'1,2,3'` directly. `arrayMap()` with `toString()` is still useful when you want to control the formatting of each element (for example, to round or pad values) before joining:

```sql
-- Join an array of UInt64 IDs into a comma-separated string
SELECT
    report_id,
    arrayStringConcat(
        arrayMap(id -> toString(id), related_ids),
        ', '
    ) AS related_ids_str
FROM reports
LIMIT 10;
```

```sql
-- Summarize p50/p90/p99 latencies as a single string
SELECT
    service,
    arrayStringConcat(
        arrayMap(v -> toString(round(v, 1)), [p50, p90, p99]),
        ' / '
    ) AS latency_summary
FROM service_latency_stats
LIMIT 10;
```

## Limiting the Number of Collected Values

To avoid extremely long strings from high-cardinality groups, combine `groupArray(n)(...)` with a limit argument before passing to `arrayStringConcat()`:

```sql
-- Show at most 5 example values per error type
SELECT
    error_type,
    arrayStringConcat(groupArray(5)(message), ' | ') AS sample_messages
FROM application_errors
GROUP BY error_type
ORDER BY error_type
LIMIT 20;
```

## Summary

`arrayStringConcat(arr, sep)` joins the elements of an `Array(T)` into a single string with `sep` between each pair, stringifying non-string elements automatically. The separator defaults to an empty string when omitted. It is the companion function to `groupArray()` and `groupUniqArray()`, which collect column values into arrays within an aggregation. Use `arraySort()` on the array before calling `arrayStringConcat()` to control element order, and `arrayMap()` with `toString()` when you want custom formatting of each element before joining. The function also works directly on array-typed columns without any aggregation.
