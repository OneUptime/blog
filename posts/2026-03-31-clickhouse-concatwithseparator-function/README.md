# How to Use concatWithSeparator() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Data Formatting, SQL

Description: Learn how concatWithSeparator() joins multiple strings with a delimiter in ClickHouse, similar to Python's str.join(), for building CSV rows, paths, and labels.

---

Concatenating strings with a consistent delimiter is one of the most common string operations in data engineering: building CSV fields, constructing file paths, joining tag lists, assembling composite keys, and formatting display labels. ClickHouse's `concatWithSeparator()` function does this in a single call, inserting a separator between each pair of adjacent arguments while never adding the separator at the start or end.

## Function Signature

```text
concatWithSeparator(sep, str1, str2, str3, ...)
```

- `sep` - the separator string to insert between arguments
- `str1, str2, ...` - two or more strings to join

Returns a single `String`. The separator appears between consecutive arguments only, not before the first or after the last.

```sql
-- Basic usage
SELECT
    concatWithSeparator('-', '2026', '03', '31')           AS date_string,
    concatWithSeparator('/', 'api', 'v2', 'users', '42')   AS url_path,
    concatWithSeparator(', ', 'Alice', 'Bob', 'Charlie')   AS name_list;
```

```text
date_string | url_path          | name_list
------------|-------------------|---------------------
2026-03-31  | api/v2/users/42   | Alice, Bob, Charlie
```

## Building CSV Rows

A frequent ETL requirement is exporting ClickHouse data as CSV without using a file format handler. `concatWithSeparator()` constructs each row as a comma-separated string.

```sql
-- Build CSV lines from table columns
SELECT
    concatWithSeparator(
        ',',
        toString(user_id),
        name,
        email,
        toString(created_at),
        toString(status)
    ) AS csv_row
FROM users
LIMIT 10;
```

```sql
-- Add a header row using UNION ALL
SELECT concatWithSeparator(',', 'user_id', 'name', 'email', 'created_at', 'status') AS csv_row
UNION ALL
SELECT concatWithSeparator(',', toString(user_id), name, email, toString(created_at), toString(status))
FROM users
ORDER BY csv_row
LIMIT 100;
```

## Constructing File Paths

When building storage paths from components (bucket, date partition, filename), `concatWithSeparator()` keeps the code readable compared to nested `concat()` calls.

```sql
-- Build S3 object paths from parts
SELECT
    concatWithSeparator(
        '/',
        'my-bucket',
        'logs',
        toString(toDate(event_time)),
        concat(toString(service_name), '.log')
    ) AS s3_path
FROM log_index
LIMIT 5;
```

```text
s3_path
----------------------------------------------
my-bucket/logs/2026-03-31/api-service.log
my-bucket/logs/2026-03-31/worker-service.log
```

## Joining Column Values for Composite Labels

Dashboard and reporting queries often need composite dimension labels. `concatWithSeparator()` produces them cleanly.

```sql
-- Create a composite key for grouping
SELECT
    concatWithSeparator('|', region, environment, service_name) AS dimension_key,
    count()     AS events,
    avg(latency_ms) AS avg_latency
FROM spans
WHERE event_date = today()
GROUP BY dimension_key
ORDER BY events DESC
LIMIT 20;
```

```sql
-- Human-readable label for a dashboard tooltip
SELECT
    concatWithSeparator(' - ', region, environment, service_name) AS tooltip_label,
    quantile(0.99)(latency_ms) AS p99_latency
FROM spans
WHERE event_date = today()
GROUP BY tooltip_label
ORDER BY p99_latency DESC
LIMIT 10;
```

## Handling NULL Values

`concatWithSeparator()` propagates `NULL`: if any argument is `NULL`, the entire result is `NULL`. Use `coalesce()` or `ifNull()` to substitute a default value before concatenating.

```sql
-- Replace NULLs before joining to avoid NULL propagation
SELECT
    concatWithSeparator(
        ', ',
        ifNull(city, 'Unknown'),
        ifNull(state, 'Unknown'),
        ifNull(country, 'Unknown')
    ) AS location_label
FROM user_addresses
LIMIT 10;
```

```sql
-- Demonstrate the NULL propagation behavior
SELECT
    concatWithSeparator(',', 'a', NULL, 'b')             AS with_null,
    concatWithSeparator(',', 'a', ifNull(NULL, ''), 'b') AS null_replaced;
```

```text
with_null | null_replaced
----------|-------------
NULL      | a,,b
```

## Aggregating Strings Within Groups

For collecting multiple values per group into a single delimited string, use `arrayStringConcat()` together with `groupArray()`. This is the aggregation counterpart to `concatWithSeparator()`.

```sql
-- List all tags for each article as a comma-separated string
SELECT
    article_id,
    arrayStringConcat(groupArray(tag_name), ', ') AS tags
FROM article_tags
GROUP BY article_id
ORDER BY article_id
LIMIT 10;
```

`arrayStringConcat(groupArray(x), sep)` is the aggregation equivalent: it collects values into an array first, then joins them. Use `concatWithSeparator()` when the number of arguments is fixed at query write time, and `arrayStringConcat(groupArray(...), sep)` when you are joining a variable number of rows.

## Comparing concatWithSeparator() to concat()

```sql
-- These two are equivalent for 3 fixed arguments
SELECT
    concat('a', '-', 'b', '-', 'c')       AS manual_concat,
    concatWithSeparator('-', 'a', 'b', 'c') AS with_separator;
```

```text
manual_concat | with_separator
--------------|---------------
a-b-c         | a-b-c
```

`concatWithSeparator()` becomes significantly more convenient as the number of arguments grows, since you define the separator once rather than repeating it between every pair of arguments.

## Building Query Filter Strings for Logging

When logging the parameters of a dynamically constructed query, `concatWithSeparator()` produces a readable summary line.

```sql
-- Log a human-readable summary of applied filters
SELECT
    concatWithSeparator(
        ' AND ',
        concat('region = ''', region, ''''),
        concat('service = ''', service_name, ''''),
        concat('date = ', toString(today()))
    ) AS applied_filters
FROM (
    SELECT 'us-east-1' AS region, 'api-gateway' AS service_name
);
```

```text
applied_filters
-------------------------------------------------------
region = 'us-east-1' AND service = 'api-gateway' AND date = 2026-03-31
```

## Summary

`concatWithSeparator()` is the idiomatic ClickHouse way to join a fixed set of string arguments with a common delimiter. It is cleaner than nested `concat()` calls when you have more than two arguments, and it mirrors the behavior of Python's `separator.join([...])` for a known list of values. Use it for CSV row generation, file path construction, composite dimension labels, and human-readable filter summaries. For variable-length aggregation across rows, pair it with `arrayStringConcat(groupArray(...), sep)`.
