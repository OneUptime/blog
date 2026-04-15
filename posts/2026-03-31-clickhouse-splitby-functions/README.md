# How to Use splitByChar() and splitByString() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Array, Parsing, Analytics

Description: Learn how splitByChar() and splitByString() split strings into arrays in ClickHouse, with examples for CSV parsing, log tokenization, and path splitting.

---

When a string column stores multiple values packed together with a delimiter - a comma-separated list, a slash-delimited path, or a space-separated log field - you need to split it into an array before you can operate on the individual parts. ClickHouse provides `splitByChar()` for single-character delimiters and `splitByString()` for multi-character ones. Both return an `Array(String)` that you can then process with array functions or `arrayJoin()`.

## splitByChar() - Single-Character Delimiter

```text
splitByChar(separator, str)
```

`separator` must be a string containing exactly one character. The function splits `str` at every occurrence of that character and returns the pieces as an array. If two delimiters appear consecutively, the element between them is an empty string.

```sql
-- Split a comma-separated tag list into an array
SELECT splitByChar(',', 'error,warning,info,debug') AS tags;
-- result: ['error', 'warning', 'info', 'debug']
```

```sql
-- Split a filesystem path into path components
SELECT splitByChar('/', '/var/log/nginx/access.log') AS parts;
-- result: ['', 'var', 'log', 'nginx', 'access.log']
```

Note that a leading delimiter produces an empty string as the first element. Use `arrayFilter()` to remove empty elements if needed:

```sql
SELECT arrayFilter(x -> x != '', splitByChar('/', '/var/log/nginx/access.log')) AS parts;
-- result: ['var', 'log', 'nginx', 'access.log']
```

## splitByString() - Multi-Character Delimiter

```text
splitByString(separator, str)
```

`splitByString()` works the same way as `splitByChar()` but accepts a separator of any length. Use it when the delimiter is two or more characters.

```sql
-- Split on a double-colon separator
SELECT splitByString('::', 'com::example::payments::service') AS parts;
-- result: ['com', 'example', 'payments', 'service']
```

```sql
-- Split a log line on the literal string ' | ' (space-pipe-space)
SELECT splitByString(' | ', '2024-03-15 | ERROR | Payment failed | txn=abc123') AS fields;
-- result: ['2024-03-15', 'ERROR', 'Payment failed', 'txn=abc123']
```

## Parsing CSV-Like Fields

Denormalized CSV-style columns are common in log aggregation pipelines. `splitByChar()` makes it straightforward to break them apart:

```sql
-- Extract the second field (index 2) from a pipe-delimited row
SELECT
    raw_line,
    splitByChar('|', raw_line)[2] AS second_field
FROM raw_import
LIMIT 10;
```

```sql
-- Parse a key=value pair list and extract a specific key
SELECT
    session_id,
    splitByChar(',', attributes) AS kv_pairs
FROM session_events
LIMIT 5;
```

To process every element of the resulting array as its own row, combine with `arrayJoin()`:

```sql
SELECT
    session_id,
    arrayJoin(splitByChar(',', tags)) AS tag
FROM events
WHERE tags != ''
ORDER BY session_id
LIMIT 20;
```

## Splitting Log Entries

Application log lines often pack multiple fields into a single string. `splitByString()` handles structured log formats that use multi-character separators:

```sql
-- Split structured log lines that use ' - ' as field separator
SELECT
    splitByString(' - ', log_line)[1] AS log_timestamp,
    splitByString(' - ', log_line)[2] AS log_level,
    splitByString(' - ', log_line)[3] AS log_message
FROM application_logs
LIMIT 10;
```

For cleaner column extraction, compute the array once and index into it:

```sql
SELECT
    fields[1] AS log_timestamp,
    fields[2] AS log_level,
    fields[3] AS log_message
FROM (
    SELECT splitByString(' - ', log_line) AS fields
    FROM application_logs
)
LIMIT 10;
```

## Tokenizing URL Paths

Breaking a URL path into segments is a common requirement for path-level analytics:

```sql
-- Count page views per top-level path segment
SELECT
    arrayFilter(x -> x != '', splitByChar('/', url_path))[1] AS section,
    COUNT(*) AS views
FROM page_views
WHERE url_path LIKE '/%'
GROUP BY section
ORDER BY views DESC
LIMIT 20;
```

```sql
-- Find the depth of each URL path (number of non-empty segments)
SELECT
    url_path,
    length(arrayFilter(x -> x != '', splitByChar('/', url_path))) AS depth
FROM page_views
ORDER BY depth DESC
LIMIT 10;
```

## Working with the Resulting Array

The array returned by `splitByChar()` and `splitByString()` is a standard ClickHouse `Array(String)`. All array functions apply directly:

```sql
-- Reverse the order of path segments
SELECT
    url_path,
    arrayStringConcat(
        arrayReverse(arrayFilter(x -> x != '', splitByChar('/', url_path))),
        '/'
    ) AS reversed_path
FROM page_views
LIMIT 5;
```

```sql
-- Check whether a specific segment appears in the path
SELECT
    url_path,
    has(splitByChar('/', url_path), 'api') AS is_api_request
FROM page_views
LIMIT 10;
```

## Handling Edge Cases

Both functions return a single-element array containing the original string when the delimiter is not found:

```sql
SELECT splitByChar(',', 'no_comma_here') AS result;
-- result: ['no_comma_here']
```

An empty input string returns an array with a single empty string:

```sql
SELECT splitByChar(',', '') AS result;
-- result: ['']
```

If the separator itself is empty, `splitByString()` splits the string into an array of individual characters. For example, `splitByString('', 'abc')` returns `['a', 'b', 'c']`.

## Summary

`splitByChar(sep, str)` splits a string on a single-character delimiter, returning an `Array(String)`. `splitByString(sep, str)` extends this to multi-character delimiters. Both return empty strings for consecutive delimiters, which you can filter out with `arrayFilter()`. Use them with `arrayJoin()` to unnest arrays into rows, with array index notation `[n]` to extract specific fields, and with array aggregation functions to analyze the resulting elements. For more complex splitting logic - such as splitting on multiple different delimiters - use `splitByRegexp()` instead.
