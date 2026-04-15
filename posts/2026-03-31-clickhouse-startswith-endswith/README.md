# How to Use startsWith() and endsWith() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Filtering, SQL

Description: Learn how to use startsWith() and endsWith() in ClickHouse to filter rows by string prefixes and suffixes, with practical examples for URLs, file paths, and logs.

---

Prefix and suffix matching are among the most common string filtering operations in data pipelines. ClickHouse provides `startsWith(str, prefix)` and `endsWith(str, suffix)` as first-class functions that return `1` when the condition is met and `0` otherwise. They are readable alternatives to `LIKE 'prefix%'` or `LIKE '%suffix'` and can be combined with indexing strategies. For example, `startsWith` can leverage bloom filter and token bloom filter (tokenbf_v1) skipping indexes, while `endsWith` can leverage token bloom filter and n-gram bloom filter (ngrambf_v1) skipping indexes.

## Function Signatures

```text
startsWith(str, prefix)   -- returns UInt8: 1 if str starts with prefix, else 0
endsWith(str, suffix)     -- returns UInt8: 1 if str ends with suffix, else 0
```

Both functions are case-sensitive and work on byte strings. For case-insensitive matching, lowercase both sides first with `lower()`.

## Filtering by URL Scheme

When you store raw URLs and want to separate HTTPS traffic from HTTP or other protocols, `startsWith` is the natural fit.

```sql
SELECT url, count() AS hits
FROM access_log
WHERE startsWith(url, 'https://')
GROUP BY url
ORDER BY hits DESC
LIMIT 10
```

You can also split traffic by scheme in a single pass using conditional aggregation.

```sql
SELECT
    countIf(startsWith(url, 'https://'))  AS https_count,
    countIf(startsWith(url, 'http://'))   AS http_count,
    countIf(startsWith(url, 'ftp://'))    AS ftp_count
FROM access_log
WHERE event_date = today()
```

## Filtering Files by Extension

`endsWith` is ideal for identifying file types stored as path strings.

```sql
SELECT
    file_path,
    size_bytes
FROM file_events
WHERE endsWith(file_path, '.log')
ORDER BY size_bytes DESC
LIMIT 20
```

To match multiple extensions you can combine `endsWith` calls with `OR`.

```sql
SELECT file_path, size_bytes
FROM file_events
WHERE
    endsWith(file_path, '.jpg')
    OR endsWith(file_path, '.jpeg')
    OR endsWith(file_path, '.png')
    OR endsWith(file_path, '.gif')
ORDER BY size_bytes DESC
```

## Filtering Log Lines by Prefix

Application logs often start with a severity label or a structured prefix. `startsWith` lets you isolate them quickly without regular expressions.

```sql
SELECT message, event_time
FROM application_logs
WHERE startsWith(message, '[ERROR]')
ORDER BY event_time DESC
LIMIT 50
```

You can also use `startsWith` to exclude certain prefixes with `NOT`.

```sql
SELECT message, event_time
FROM application_logs
WHERE NOT startsWith(message, '[DEBUG]')
  AND event_date = today()
ORDER BY event_time DESC
```

## Case-Insensitive Matching

Both functions are byte-exact. Wrap both sides in `lower()` for case-insensitive checks.

```sql
SELECT url
FROM access_log
WHERE startsWith(lower(url), 'https://api.')
LIMIT 10
```

## Categorizing Rows Based on Prefix or Suffix

Use `startsWith` and `endsWith` inside a `CASE` expression to tag or bucket records.

```sql
SELECT
    file_path,
    CASE
        WHEN endsWith(file_path, '.gz')  THEN 'compressed'
        WHEN endsWith(file_path, '.zip') THEN 'archive'
        WHEN endsWith(file_path, '.log') THEN 'log'
        ELSE 'other'
    END AS file_category
FROM file_events
LIMIT 100
```

## Combining startsWith and endsWith

Some patterns require checking both the prefix and the suffix at the same time. For example, identifying files that are both in a specific directory and have a particular extension.

```sql
SELECT file_path
FROM file_events
WHERE startsWith(file_path, '/var/log/')
  AND endsWith(file_path, '.log')
ORDER BY event_time DESC
LIMIT 50
```

## Using startsWith in Aggregations

`startsWith` and `endsWith` return `UInt8` values, so you can sum them directly in aggregations to count matches.

```sql
SELECT
    event_date,
    sum(startsWith(referrer, 'https://google.')) AS google_referrals,
    sum(startsWith(referrer, 'https://bing.'))   AS bing_referrals,
    sum(referrer = '')                            AS direct_traffic
FROM page_views
GROUP BY event_date
ORDER BY event_date
```

## Summary

`startsWith()` and `endsWith()` provide clean, readable predicate functions for prefix and suffix matching in ClickHouse. They return `UInt8` values that can be used directly in `WHERE` clauses, `CASE` expressions, and aggregation functions like `sum()` and `countIf()`. For case-insensitive matching, lower both sides with `lower()` before comparing. These functions cover a wide range of practical filtering tasks including URL scheme detection, file extension filtering, and log prefix matching.
