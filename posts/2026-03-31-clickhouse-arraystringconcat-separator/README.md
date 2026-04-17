# How to Use arrayStringConcat() with Custom Separators in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayStringConcat, String

Description: Learn how arrayStringConcat() joins array elements into a single string with a custom separator in ClickHouse for CSV output, tag joining, and path construction.

---

Converting an array of strings or numbers into a single concatenated string is a routine operation in report generation, CSV export, path building, and display formatting. `arrayStringConcat` joins all elements of an array with a separator string, returning a single `String`. It is the inverse of `splitByString`.

## Function Signature

```text
arrayStringConcat(arr [, separator]) -> String
```

- `arr` - an array of any type; non-string elements are converted to their string representation
- `separator` - optional separator string; defaults to an empty string if omitted

## Basic Usage

```sql
-- Join with comma separator
SELECT arrayStringConcat(['apple', 'banana', 'cherry'], ', ') AS csv;
-- Result: 'apple, banana, cherry'

-- Join with no separator (concatenate directly)
SELECT arrayStringConcat(['Hello', ' ', 'World']) AS greeting;
-- Result: 'Hello World'  (no extra separator, the space is the middle element)

-- Join with empty separator
SELECT arrayStringConcat(['a', 'b', 'c'], '') AS no_sep;
-- Result: 'abc'

-- Join with newline separator
SELECT arrayStringConcat(['line1', 'line2', 'line3'], '\n') AS multiline;
-- Result: 'line1\nline2\nline3'

-- Numeric arrays - elements are cast to strings
SELECT arrayStringConcat([1, 2, 3, 4, 5], '-') AS hyphen_nums;
-- Result: '1-2-3-4-5'

-- Single element - no separator used
SELECT arrayStringConcat(['only'], ',') AS single;
-- Result: 'only'

-- Empty array - returns empty string
SELECT arrayStringConcat([], ',') AS empty;
-- Result: ''
```

## Generating CSV Output from Tag Arrays

A common reporting requirement is displaying array columns as comma-separated strings in an output that will be consumed by non-ClickHouse tools:

```sql
CREATE TABLE articles
(
    article_id UInt32,
    title String,
    tags Array(String)
) ENGINE = Memory;

INSERT INTO articles VALUES
    (1, 'ClickHouse Arrays', ['clickhouse', 'arrays', 'sql']),
    (2, 'Time Series Tips',  ['timeseries', 'analytics', 'performance']),
    (3, 'Query Tuning',      ['sql', 'performance', 'indexing']);

-- Format tags as CSV for display
SELECT
    article_id,
    title,
    arrayStringConcat(tags, ', ') AS tags_csv
FROM articles;
-- 1  ClickHouse Arrays  'clickhouse, arrays, sql'
-- 2  Time Series Tips   'timeseries, analytics, performance'
-- 3  Query Tuning       'sql, performance, indexing'
```

## Building File Paths

Join a path components array with a slash separator to reconstruct filesystem or URL paths:

```sql
SELECT
    arrayStringConcat(['usr', 'local', 'bin', 'clickhouse'], '/') AS unix_path;
-- Result: 'usr/local/bin/clickhouse'

SELECT
    arrayStringConcat(['https:', '', 'example.com', 'api', 'v1', 'users'], '/') AS url;
-- Result: 'https://example.com/api/v1/users'

-- Build paths from a table column
CREATE TABLE resource_paths
(
    resource_id UInt32,
    path_parts Array(String)
) ENGINE = Memory;

INSERT INTO resource_paths VALUES
    (1, ['data', 'clickhouse', 'tables', 'events']),
    (2, ['config', 'server', 'settings']),
    (3, ['logs', 'application', '2024', 'errors']);

SELECT
    resource_id,
    '/' || arrayStringConcat(path_parts, '/') AS full_path
FROM resource_paths;
-- 1: /data/clickhouse/tables/events
-- 2: /config/server/settings
-- 3: /logs/application/2024/errors
```

## Joining Tag Values for Full-Text Display

When building human-readable output that includes hashtags or labels, `arrayStringConcat` with custom formatting prefixes applied via `arrayMap` provides full control:

```sql
-- Prepend '#' to each tag, then join
SELECT
    article_id,
    arrayStringConcat(
        arrayMap(t -> concat('#', t), tags),
        ' '
    ) AS hashtags
FROM articles;
-- 1: '#clickhouse #arrays #sql'
-- 2: '#timeseries #analytics #performance'
-- 3: '#sql #performance #indexing'
```

## Converting Number Arrays to Readable Strings

`arrayStringConcat` handles non-string arrays by converting elements automatically, useful for displaying metric arrays:

```sql
CREATE TABLE hourly_metrics
(
    service String,
    request_counts Array(UInt32)
) ENGINE = Memory;

INSERT INTO hourly_metrics VALUES
    ('api-gateway', [145, 210, 198, 320, 450, 380]),
    ('auth-service', [55, 62, 48, 71, 90, 78]);

SELECT
    service,
    arrayStringConcat(request_counts, ' | ') AS hourly_report
FROM hourly_metrics;
-- api-gateway:  '145 | 210 | 198 | 320 | 450 | 380'
-- auth-service: '55 | 62 | 48 | 71 | 90 | 78'
```

## Reconstructing Delimited Strings

`arrayStringConcat` is the inverse of `splitByString`. Together they let you parse, modify, and re-serialize delimited values:

```sql
-- Parse, deduplicate, sort, and re-join a comma-separated tag string
SELECT arrayStringConcat(
    arraySort(
        arrayDistinct(
            splitByString(', ', 'sql, performance, sql, indexing, performance')
        )
    ),
    ', '
) AS cleaned_tags;
-- Result: 'indexing, performance, sql'  (sorted, deduplicated)
```

## Conditional Joining - Skip Empty Elements

When an array may contain empty strings you want to exclude, filter them first:

```sql
SELECT arrayStringConcat(
    arrayFilter(x -> x != '', ['active', '', 'premium', '', 'beta']),
    ', '
) AS clean_labels;
-- Result: 'active, premium, beta'
```

## Summary

`arrayStringConcat(arr, sep)` joins all elements of an array into a single string, using the given separator between each pair of adjacent elements. Non-string elements are automatically cast to strings. It is the standard tool for generating CSV columns from tag arrays, constructing paths from component arrays, formatting numeric arrays for display, and reversing `splitByString`. Pair it with `arrayMap` for element-level transformations before joining, and `arrayFilter` to exclude empty or unwanted elements.
