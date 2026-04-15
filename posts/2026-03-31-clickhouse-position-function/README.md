# How to Use position() and positionCaseInsensitive() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Text Search, SQL

Description: Learn how to use position(), positionCaseInsensitive(), and positionUTF8() in ClickHouse to locate substrings within strings using byte and Unicode offsets.

---

String searching is a fundamental operation in log analysis, data parsing, and content filtering. ClickHouse provides several `position()` variants that return the 1-based index of a substring within a string, covering byte-level, case-insensitive, and Unicode-aware scenarios. This post walks through each variant with practical examples.

## Understanding position()

`position(haystack, needle)` scans `haystack` for the first occurrence of `needle` and returns its 1-based byte position. If the needle is not found, it returns `0`. This makes it straightforward to use in `WHERE` clauses and conditional expressions.

```sql
-- Basic substring location
SELECT
    position('clickhouse analytics', 'analytics') AS found_at,
    position('clickhouse analytics', 'missing')   AS not_found;
```

```text
found_at | not_found
---------|----------
12       | 0
```

The result `12` means the substring `analytics` starts at byte 12. The result `0` confirms the needle was not found.

## Filtering Rows Based on Substring Presence

A common use case is filtering log lines or URL paths that contain a specific token. Because `position()` returns `0` when the needle is absent, you can use a simple `> 0` comparison.

```sql
-- Find all requests that hit an API endpoint
SELECT
    request_path,
    position(request_path, '/api/') AS api_offset
FROM http_logs
WHERE position(request_path, '/api/') > 0
LIMIT 20;
```

This is equivalent to `LIKE '%/api/%'` but gives you the byte offset as a bonus column for downstream parsing.

## Case-Insensitive Search with positionCaseInsensitive()

`positionCaseInsensitive(haystack, needle)` works identically to `position()` but ignores letter case during comparison. Use this when your data may have inconsistent casing.

```sql
-- Match error keywords regardless of casing
SELECT
    log_line,
    positionCaseInsensitive(log_line, 'error') AS error_pos
FROM application_logs
WHERE positionCaseInsensitive(log_line, 'error') > 0
LIMIT 10;
```

```sql
-- Demonstrate the case difference
SELECT
    position('Hello World', 'world')                    AS case_sensitive,
    positionCaseInsensitive('Hello World', 'world')     AS case_insensitive;
```

```text
case_sensitive | case_insensitive
---------------|----------------
0              | 7
```

`position()` returns `0` because `world` (lowercase) does not match `World` (uppercase W). `positionCaseInsensitive()` correctly returns `7`.

## Unicode-Aware Search with positionUTF8()

`position()` and `positionCaseInsensitive()` operate on raw bytes. When your strings contain multi-byte UTF-8 characters (accented letters, CJK characters, emoji), byte positions and character positions diverge. Use `positionUTF8()` when you need character-based offsets.

```sql
-- A string where each character may be multiple bytes
SELECT
    position('Привет мир', 'мир')      AS byte_position,
    positionUTF8('Привет мир', 'мир')  AS char_position;
```

```text
byte_position | char_position
--------------|-------------
14            | 8
```

The Cyrillic characters each occupy 2 bytes in UTF-8 (6 × 2 = 12 bytes), plus 1 byte for the space, so the byte offset of `мир` is 14, but the character offset is 8. Use `positionUTF8()` whenever you need to slice or display characters correctly after finding a match.

## Extracting Substrings After a Delimiter

Combining `position()` with `substring()` lets you parse structured strings without regular expressions, which is faster at scale.

```sql
-- Extract the path component from a full URL
-- e.g. "https://example.com/api/v2/users" -> "/api/v2/users"
SELECT
    url,
    substring(url, position(url, '/api')) AS api_path
FROM requests
WHERE position(url, '/api') > 0
LIMIT 5;
```

```sql
-- Parse key=value pairs: extract value after '='
SELECT
    raw_pair,
    substring(raw_pair, position(raw_pair, '=') + 1) AS value_part
FROM (
    SELECT 'status=active'   AS raw_pair UNION ALL
    SELECT 'region=us-east-1' UNION ALL
    SELECT 'retries=3'
);
```

```text
raw_pair          | value_part
------------------|----------
status=active     | active
region=us-east-1  | us-east-1
retries=3         | 3
```

## Finding the nth Occurrence

ClickHouse does not have a built-in `nthOccurrence` function, but you can chain `position()` calls using the optional `start_pos` argument: `position(haystack, needle, start_pos)`.

```sql
-- Find the second occurrence of '/' in a path
SELECT
    path,
    position(path, '/', position(path, '/') + 1) AS second_slash
FROM (
    SELECT '/api/v2/users' AS path UNION ALL
    SELECT '/health/check'
);
```

```text
path           | second_slash
---------------|------------
/api/v2/users  | 5
/health/check  | 8
```

By passing `position(path, '/') + 1` as the start position, the second call skips past the first match.

## Performance Considerations

- `position()` uses a byte-level search and is very fast on ASCII data.
- `positionCaseInsensitive()` is slightly slower because it normalizes case during comparison.
- `positionUTF8()` scans byte by byte but counts characters, making it slower on long strings with many multi-byte characters.
- For multi-keyword searches, prefer `multiSearchAny()` (covered in a separate post) over multiple `position()` calls ORed together.

## Summary

`position()`, `positionCaseInsensitive()`, and `positionUTF8()` are lightweight, high-performance functions for locating substrings in ClickHouse. Use `position()` for fast byte-level ASCII searches, `positionCaseInsensitive()` when casing is inconsistent, and `positionUTF8()` when dealing with multi-byte character sets. Combine them with `substring()` to build efficient, regex-free string parsers for logs, URLs, and structured text fields.
