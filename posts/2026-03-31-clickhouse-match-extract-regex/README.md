# How to Use match() and extract() Regex Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Regex, Log Parsing, Data Extraction

Description: Learn how match(), extract(), and extractAll() work in ClickHouse for testing regex patterns and pulling structured values out of unstructured text columns.

---

ClickHouse includes three closely related functions for regular expression work: `match()` tests whether a string matches a pattern, `extract()` returns the first captured group from the first match, and `extractAll()` returns every captured group across all matches as an array. Together they cover the most common needs when parsing log lines, extracting structured fields from free text, or filtering rows by a complex pattern.

## match() - Testing for a Pattern

```text
match(haystack, pattern)
```

Returns `1` (UInt8) if `haystack` matches `pattern` anywhere in the string, `0` otherwise. The pattern does not need to match the full string - it is a search, not an anchor. To match the entire string from start to end, use `^` and `$` anchors explicitly.

```sql
-- Returns 1 if the message contains a 4xx or 5xx status code
SELECT match(log_line, ' [45]\\d{2} ') AS is_error
FROM access_logs
LIMIT 5;
```

```sql
-- Use match() in a WHERE clause to filter rows
SELECT timestamp, log_line
FROM access_logs
WHERE match(log_line, ' 5\\d{2} ')
ORDER BY timestamp DESC
LIMIT 20;
```

```sql
-- Anchor to match the full string: only pure numeric strings
SELECT word, match(word, '^\\d+$') AS is_numeric
FROM word_list
LIMIT 10;
```

## extract() - Capturing the First Match

```text
extract(haystack, pattern)
```

Returns a `String` containing the content of the first capture group `(...)` in the first match of `pattern`. If there is no match, an empty string is returned. If the pattern has no capture group, the entire matched substring is returned instead.

```sql
-- Extract the HTTP status code from a combined log format line
SELECT extract(
    '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /index.html HTTP/1.0" 200 2326',
    '"\\w+ \\S+ HTTP/[\\d.]+" (\\d{3})'
) AS status_code;
-- result: '200'
```

```sql
-- Extract the first IPv4 address found in a log message
SELECT
    message,
    extract(message, '(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})') AS ip_address
FROM events
WHERE match(message, '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}')
LIMIT 10;
```

```sql
-- Pull the version number out of a user-agent string
SELECT
    user_agent,
    extract(user_agent, 'Chrome/(\\d+\\.\\d+)') AS chrome_version
FROM requests
WHERE match(user_agent, 'Chrome/')
LIMIT 10;
```

## Parsing Structured Fields from Log Lines

A common use case is breaking a structured log format into typed columns. The following example works with nginx combined log format:

```sql
SELECT
    extract(log_line, '^(\\S+)')                                   AS remote_addr,
    extract(log_line, '\\[(.*?)\\]')                               AS time_local,
    extract(log_line, '"\\w+ (\\S+) HTTP')                         AS request_path,
    extract(log_line, '"\\w+ \\S+ HTTP/[\\d.]+" (\\d{3})')         AS status,
    extract(log_line, '"\\w+ \\S+ HTTP/[\\d.]+" \\d+ (\\d+)')      AS bytes_sent
FROM nginx_raw_logs
LIMIT 5;
```

These extracted string columns can then be cast to the appropriate types for aggregation:

```sql
SELECT
    toUInt16OrZero(
        extract(log_line, '"\\w+ \\S+ HTTP/[\\d.]+" (\\d{3})')
    ) AS status_code,
    COUNT(*) AS request_count
FROM nginx_raw_logs
GROUP BY status_code
ORDER BY request_count DESC;
```

## extractAll() - All Matches as an Array

```text
extractAll(haystack, pattern)
```

Returns an `Array(String)` containing every non-overlapping match of the first capture group in `pattern`, scanned left to right.

```sql
-- Extract all IPv4 addresses from a multi-hop trace log
SELECT extractAll(
    'Hop 1: 10.0.0.1 -> Hop 2: 10.0.0.2 -> Hop 3: 203.0.113.5',
    '(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})'
) AS hops;
-- result: ['10.0.0.1', '10.0.0.2', '203.0.113.5']
```

```sql
-- Extract all hashtags from a social media post
SELECT
    post_id,
    extractAll(body, '#([A-Za-z0-9_]+)') AS hashtags
FROM posts
LIMIT 10;
```

```sql
-- Count how many numbers appear in each log message
SELECT
    message,
    length(extractAll(message, '(\\d+)')) AS number_count
FROM events
ORDER BY number_count DESC
LIMIT 10;
```

## Combining extractAll() with Array Functions

Because `extractAll()` returns an array, you can feed its result directly into array functions for further processing:

```sql
-- Find all unique domains mentioned in a log column
SELECT DISTINCT arrayJoin(
    extractAll(message, 'https?://([a-zA-Z0-9.\\-]+)')
) AS domain
FROM events
LIMIT 20;
```

```sql
-- Aggregate all error codes seen per session
SELECT
    session_id,
    groupArray(
        extract(message, 'code=(\\d+)')
    ) AS error_codes
FROM session_logs
WHERE match(message, 'code=\\d+')
GROUP BY session_id
LIMIT 10;
```

## Building a Structured Log Table with Materialized Columns

For high-volume log ingestion, extract fields once at write time using materialized columns rather than at query time:

```sql
CREATE TABLE nginx_logs (
    log_line       String,
    remote_addr    String MATERIALIZED extract(log_line, '^(\\S+)'),
    request_path   String MATERIALIZED extract(log_line, '"\\w+ (\\S+) HTTP'),
    status_code    UInt16 MATERIALIZED toUInt16OrZero(
                       extract(log_line, '"\\w+ \\S+ HTTP/[\\d.]+" (\\d{3})')
                   ),
    bytes_sent     UInt64 MATERIALIZED toUInt64OrZero(
                       extract(log_line, '"\\w+ \\S+ HTTP/[\\d.]+" \\d+ (\\d+)')
                   )
) ENGINE = MergeTree()
ORDER BY (status_code, remote_addr);
```

Queries against `status_code` or `remote_addr` then hit the primary key directly instead of re-running the regex on every read.

## RE2 Syntax Reminders

ClickHouse uses the RE2 regex library. Key points to remember:

```text
.       any character except newline
\d      digit [0-9]
\w      word character [A-Za-z0-9_]
\s      whitespace
\S      non-whitespace
+       one or more (greedy)
*       zero or more (greedy)
?       zero or one
(...)   capture group
^       start of string
$       end of string
```

In ClickHouse SQL string literals, every backslash must be doubled: write `\\d` to represent the regex token `\d`.

## Summary

`match(haystack, pattern)` returns 1 or 0 and is the right choice for boolean filtering. `extract(haystack, pattern)` returns the content of the first capture group from the first match, making it ideal for pulling a single structured field from a string. `extractAll(haystack, pattern)` returns all matches as an array, which composes naturally with `arrayJoin()`, `length()`, and other array functions. For high-volume tables, prefer materialized columns to avoid re-running regex at query time.
