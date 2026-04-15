# How to Use regexpQuoteMeta() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Regular Expression, Security, SQL

Description: Learn how regexpQuoteMeta() escapes special regex characters so any string can be used as a safe literal pattern in ClickHouse regex functions.

---

When building regex patterns dynamically from user input or stored data, special regex characters like `.`, `*`, `+`, `?`, `(`, `)`, `[`, `]`, `{`, `}`, `^`, `$`, `|`, and `\` have metacharacter meaning. If a user searches for a price like `$9.99` or a file path like `C:\Users\alice`, these characters will be interpreted as regex operators rather than literals, producing wrong results or errors. `regexpQuoteMeta()` escapes all such characters so the resulting string matches literally in any ClickHouse regex function.

## Function Signature

```text
regexpQuoteMeta(str)
```

- `str` - the input string that may contain regex metacharacters

Returns a `String` where every regex special character is prefixed with a backslash, making the entire string safe to use as a literal component in a larger regex pattern.

## Basic Escaping

The following example shows how different inputs are escaped.

```sql
SELECT
    raw_input,
    regexpQuoteMeta(raw_input) AS escaped
FROM (
    SELECT arrayJoin([
        '$9.99',
        'C:\\Users\\alice',
        'example.com',
        '100% complete',
        '(high priority)',
        'a+b=c',
        '[ERROR]'
    ]) AS raw_input
)
```

```text
raw_input         | escaped
------------------+---------------------------
$9.99             | \$9\.99
C:\Users\alice    | C:\\Users\\alice
example.com       | example\.com
100% complete     | 100% complete
(high priority)   | \(high priority\)
a+b=c             | a\+b=c
[ERROR]           | \[ERROR\]
```

Note that `%` is not a regex metacharacter, so it passes through unchanged.

## Using regexpQuoteMeta for Safe User-Input Search

Suppose users can enter a search term into a dashboard, and you pass that term directly into a `match()` predicate. Without escaping, a user searching for `example.com` would match `exampleXcom` because `.` matches any character in regex. With `regexpQuoteMeta`, the dot is escaped to `\.` and only matches a literal dot.

```sql
-- user_search_term comes from application input
WITH regexpQuoteMeta('example.com') AS safe_pattern
SELECT url, count() AS hits
FROM access_log
WHERE match(url, safe_pattern)
GROUP BY url
ORDER BY hits DESC
LIMIT 20
```

## Building Anchored Patterns Dynamically

You can combine `regexpQuoteMeta` with string concatenation to construct anchored patterns. The following checks whether a log message starts with an exact literal prefix supplied at query time.

```sql
WITH concat('^', regexpQuoteMeta('[ERROR] Failed to connect')) AS safe_prefix_pattern
SELECT event_time, message
FROM application_logs
WHERE match(message, safe_prefix_pattern)
ORDER BY event_time DESC
LIMIT 50
```

The `^` anchor is added outside the escaped portion because you intentionally want it to act as a regex anchor rather than a literal character.

## Whole-Word Matching with Word Boundaries

To find messages containing an exact phrase as a whole word (not as a substring), wrap the escaped pattern with `\b` word boundary anchors.

```sql
WITH concat('\\b', regexpQuoteMeta('null'), '\\b') AS word_pattern
SELECT event_time, message
FROM application_logs
WHERE match(message, word_pattern)
ORDER BY event_time DESC
LIMIT 20
```

This matches `null` as a standalone word but not `nullable` or `nonnull`.

## Escaping Values from a Table for Dynamic Pattern Construction

When the patterns come from a table rather than inline literals, you can escape them in a subquery.

```sql
SELECT
    l.event_time,
    l.message,
    b.bad_string
FROM application_logs AS l
CROSS JOIN (
    SELECT regexpQuoteMeta(bad_string) AS bad_string
    FROM blocklist_strings
) AS b
WHERE match(l.message, b.bad_string)
  AND l.event_date = today()
LIMIT 100
```

This safely checks each log message against every entry in a blocklist, even if those entries contain regex special characters.

## Escaping File Paths for Pattern Matching

File system paths on Windows contain backslashes which are also the regex escape character. `regexpQuoteMeta` handles them correctly.

```sql
WITH regexpQuoteMeta('C:\\Program Files\\MyApp\\config.ini') AS safe_path
SELECT file_path, event_time
FROM file_access_events
WHERE match(file_path, safe_path)
ORDER BY event_time DESC
LIMIT 20
```

## Combining with extractAll for Safe Dynamic Extraction

You can use `regexpQuoteMeta` to build the literal portion of an `extractAll` pattern dynamically, surrounding an escaped keyword with a capture group for context.

```sql
SELECT
    log_line,
    extractAll(log_line, concat('(', regexpQuoteMeta('ERR:'), '[^\\s]+)')) AS error_tokens
FROM application_logs
WHERE event_date = today()
LIMIT 50
```

## Summary

`regexpQuoteMeta()` escapes every regex special character in its input, producing a string that matches itself literally when used in ClickHouse regex functions like `match()`, `extract()`, `extractAll()`, and `replaceRegexpAll()`. It is essential whenever a regex pattern is constructed from user input, stored values, or any data that may contain characters with metacharacter meaning. Combine it with string concatenation to add intentional regex operators (anchors, alternation) while keeping the dynamic portions strictly literal.
