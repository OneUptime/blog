# How to Use countSubstrings() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Text Analysis, SQL

Description: Learn how countSubstrings() counts substring occurrences in ClickHouse, with case-insensitive variants and practical examples for frequency analysis and log parsing.

---

Counting how many times a substring appears within a string is a surprisingly common need in log analysis, text mining, and data quality checks. ClickHouse provides `countSubstrings()` for case-sensitive counting and `countSubstringsCaseInsensitive()` for case-insensitive counting. Both return a `UInt64` representing the total number of non-overlapping occurrences of the needle in the haystack string.

## Function Signatures

```text
countSubstrings(haystack, needle)
countSubstringsCaseInsensitive(haystack, needle)
```

- `haystack` - the string to search within
- `needle` - the substring to count

Returns `UInt64`. If `needle` is empty, the function returns `0`. Counting is non-overlapping: once a match is found at a position, the next search starts after the end of that match.

## Basic Counting

A simple demonstration of counting a substring with varying frequency.

```sql
SELECT
    text,
    countSubstrings(text, 'the') AS count_exact,
    countSubstringsCaseInsensitive(text, 'the') AS count_insensitive
FROM (
    SELECT arrayJoin([
        'the cat sat on the mat',
        'The quick brown fox leaps over The lazy dog',
        'there is nothing here',
        'no match'
    ]) AS text
)
```

```text
text                                           | count_exact | count_insensitive
-----------------------------------------------+-------------+-------------------
the cat sat on the mat                         | 2           | 2
The quick brown fox leaps over The lazy dog    | 0           | 2
there is nothing here                          | 1           | 1
no match                                       | 0           | 0
```

Note that `'there'` contains `'the'` as a substring, so both counts include it. `countSubstrings` matches anywhere in the haystack, not just on word boundaries.

## Counting Keyword Occurrences in Log Messages

A common use case is measuring how many times a specific keyword appears in each log line to gauge verbosity or detect anomalies.

```sql
SELECT
    event_time,
    message,
    countSubstrings(message, 'error')                 AS error_count_exact,
    countSubstringsCaseInsensitive(message, 'error')  AS error_count_any_case
FROM application_logs
WHERE event_date = today()
  AND countSubstringsCaseInsensitive(message, 'error') > 0
ORDER BY error_count_any_case DESC
LIMIT 20
```

## Frequency Analysis Across a Column

To understand how often a term appears across all rows - not just within a single row - sum the per-row counts.

```sql
SELECT
    keyword,
    sum(countSubstringsCaseInsensitive(message, keyword)) AS total_occurrences,
    countIf(countSubstringsCaseInsensitive(message, keyword) > 0) AS rows_containing_keyword
FROM application_logs
CROSS JOIN (
    SELECT arrayJoin(['timeout', 'error', 'warning', 'fatal', 'retry']) AS keyword
) AS keywords
WHERE event_date >= today() - 7
GROUP BY keyword
ORDER BY total_occurrences DESC
```

## Counting Delimiter Occurrences to Infer Column Count

Before parsing a delimited string, you can sanity-check how many delimiters it contains.

```sql
SELECT
    raw_row,
    countSubstrings(raw_row, ',') AS comma_count,
    countSubstrings(raw_row, ',') + 1 AS expected_columns
FROM csv_staging
WHERE countSubstrings(raw_row, ',') != 5   -- expect 6 columns
LIMIT 100
```

This surfaces rows where the column count is wrong before you attempt to split them.

## Counting Path Depth from a URL

The number of `/` characters in a URL path indicates its depth in the hierarchy.

```sql
SELECT
    url,
    countSubstrings(url, '/') - 2 AS path_depth
FROM access_log
WHERE startsWith(url, 'https://')
ORDER BY path_depth DESC
LIMIT 20
```

Subtracting 2 removes the two slashes in `https://` from the count.

## Filtering Rows by Repetition of a Pattern

Find log messages that mention a retry token more than once, which may indicate a retry storm.

```sql
SELECT
    event_time,
    service_name,
    message,
    countSubstringsCaseInsensitive(message, 'retry') AS retry_mentions
FROM application_logs
WHERE
    event_date = today()
    AND countSubstringsCaseInsensitive(message, 'retry') >= 2
ORDER BY retry_mentions DESC
LIMIT 50
```

## Building a Word Frequency Map Using countSubstrings

For a fixed set of terms of interest, you can build a pivot table showing per-message frequency of each term.

```sql
SELECT
    event_time,
    service_name,
    countSubstringsCaseInsensitive(message, 'connect')    AS connect_count,
    countSubstringsCaseInsensitive(message, 'disconnect') AS disconnect_count,
    countSubstringsCaseInsensitive(message, 'timeout')    AS timeout_count,
    countSubstringsCaseInsensitive(message, 'refused')    AS refused_count
FROM application_logs
WHERE event_date = today()
  AND (
    countSubstringsCaseInsensitive(message, 'connect') > 0
    OR countSubstringsCaseInsensitive(message, 'timeout') > 0
  )
ORDER BY event_time DESC
LIMIT 100
```

## Comparing countSubstrings to length-Based Counting

An alternative approach for single-character needles is to compute the difference in string length before and after removing the character. `countSubstrings` is cleaner and should be preferred.

```sql
-- both approaches return the same count for a single character needle
SELECT
    text,
    countSubstrings(text, ',')                         AS using_countSubstrings,
    length(text) - length(replaceAll(text, ',', ''))   AS using_length_diff
FROM (
    SELECT 'a,b,c,d,e' AS text
)
```

## Summary

`countSubstrings(haystack, needle)` returns the number of non-overlapping occurrences of `needle` in `haystack`. `countSubstringsCaseInsensitive` applies the same logic without case sensitivity. These functions are useful for keyword frequency analysis, validating delimiter counts in delimited strings, inferring URL path depth, detecting repeated patterns in log messages, and building pivot-style frequency tables entirely in SQL. They are lightweight alternatives to regex-based counting when the pattern to count is a fixed string.
