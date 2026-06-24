# How to Use multiSearchAny() and multiSearchFirstPosition() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Text Search, Performance, SQL

Description: Learn how multiSearchAny() and multiSearchFirstPosition() use the Aho-Corasick algorithm for fast multi-keyword filtering and first-match detection in ClickHouse.

---

Searching for a single substring is easy with `position()`, but real-world workloads often require checking whether any one of dozens of keywords appears in a string. Doing this with a long chain of `OR position(...) > 0` conditions is both verbose and slower than necessary. ClickHouse provides the `multiSearch` family of functions, which uses an optimized multi-pattern matching algorithm (Multi-Volnitsky) to scan for all needles in a single pass over the haystack.

## How the Volnitsky Algorithm Works

The Multi-Volnitsky algorithm builds a compact hash table of bigrams (two-byte fragments) from all the needle strings when the query begins executing. It then steps through the haystack with a stride based on the shortest needle length, checking each bigram against the hash table to quickly skip non-matching regions. This means searching for many keywords costs only modestly more than searching for one. ClickHouse's implementation is highly optimized for CPU cache locality, making it suitable for filtering billions of rows.

## multiSearchAny()

`multiSearchAny(haystack, [needle1, needle2, ...])` returns `1` if at least one needle is found in the haystack, and `0` otherwise.

```sql
-- Check whether a log line contains any error-level keyword
SELECT
    log_line,
    multiSearchAny(log_line, ['ERROR', 'FATAL', 'CRITICAL', 'PANIC']) AS has_error
FROM application_logs
LIMIT 10;
```

```sql
-- Use it directly in a WHERE clause to filter for problematic events
SELECT
    event_time,
    service_name,
    log_line
FROM application_logs
WHERE multiSearchAny(log_line, ['ERROR', 'FATAL', 'CRITICAL', 'PANIC']) = 1
ORDER BY event_time DESC
LIMIT 50;
```

## Filtering Content by Topic Keywords

`multiSearchAny()` is ideal for content classification tasks where you want to bucket records by the presence of any term from a category list.

```sql
-- Classify news articles by topic based on headline keywords
SELECT
    headline,
    multiSearchAny(lower(headline), ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi']) AS is_crypto,
    multiSearchAny(lower(headline), ['ai', 'machine learning', 'llm', 'neural', 'gpt'])     AS is_ai,
    multiSearchAny(lower(headline), ['election', 'senate', 'congress', 'vote', 'ballot'])   AS is_politics
FROM news_articles
WHERE event_date = today()
LIMIT 20;
```

By wrapping the haystack in `lower()`, you get case-insensitive matching while keeping the needle list simple. ClickHouse also provides `multiSearchAnyCaseInsensitive()` if you want to avoid the `lower()` call.

## multiSearchAnyCaseInsensitive()

`multiSearchAnyCaseInsensitive(haystack, [needle1, needle2, ...])` is the case-insensitive variant and avoids the overhead of `lower()` on each row.

```sql
-- Detect security-relevant terms without worrying about casing
SELECT
    request_id,
    user_agent,
    multiSearchAnyCaseInsensitive(user_agent, ['sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab']) AS is_scanner
FROM http_logs
WHERE is_scanner = 1
LIMIT 100;
```

## multiSearchFirstPosition()

`multiSearchFirstPosition(haystack, [needle1, needle2, ...])` returns the byte position of the earliest starting match among all needles. If no needle is found, it returns `0`. This is useful when you need to know where the first interesting token appears in a string.

```sql
-- Find the position of the first error-level keyword in each log line
SELECT
    log_line,
    multiSearchFirstPosition(log_line, ['ERROR', 'WARN', 'INFO', 'DEBUG']) AS first_level_pos
FROM application_logs
WHERE first_level_pos > 0
LIMIT 10;
```

```sql
-- Use the position to extract the log level prefix dynamically
SELECT
    log_line,
    multiSearchFirstPosition(log_line, ['ERROR', 'WARN', 'INFO', 'DEBUG']) AS pos,
    substring(log_line, pos, 5) AS likely_level
FROM application_logs
WHERE pos > 0
LIMIT 10;
```

## Comparing Performance Against OR Chains

The following two queries are logically equivalent, but the `multiSearchAny()` version scans the string once while the `OR` chain scans it once per keyword.

```sql
-- Slower: separate position() calls
SELECT count()
FROM http_logs
WHERE
    position(url, '/admin') > 0
    OR position(url, '/wp-login') > 0
    OR position(url, '/phpmyadmin') > 0
    OR position(url, '/.env') > 0
    OR position(url, '/config') > 0;
```

```sql
-- Faster: single multi-pattern pass
SELECT count()
FROM http_logs
WHERE multiSearchAny(url, ['/admin', '/wp-login', '/phpmyadmin', '/.env', '/config']) = 1;
```

The performance difference grows with the number of needles and the length of the strings being searched.

## Building a Keyword Allowlist and Denylist

You can combine `multiSearchAny()` calls to implement allowlist and denylist logic in a single query.

```sql
-- Keep rows that match at least one allowed term
-- but do not match any blocked term
SELECT
    content_id,
    body
FROM user_posts
WHERE
    multiSearchAnyCaseInsensitive(body, ['tutorial', 'guide', 'how-to', 'example']) = 1
    AND multiSearchAnyCaseInsensitive(body, ['spam', 'casino', 'free money', 'click here']) = 0
LIMIT 100;
```

## multiSearchFirstIndex()

A related function worth knowing is `multiSearchFirstIndex(haystack, [needle1, needle2, ...])`, which returns the 1-based index of the first matching needle in the array (not the position in the string). Returns `0` if nothing matches.

```sql
-- Return which category keyword matched first
SELECT
    url,
    multiSearchFirstIndex(url, ['/api/', '/static/', '/auth/', '/admin/']) AS matched_category_idx
FROM http_logs
WHERE matched_category_idx > 0
LIMIT 10;
```

## Summary

`multiSearchAny()` and `multiSearchFirstPosition()` bring the power of the Volnitsky multi-pattern matching algorithm to ClickHouse SQL queries, allowing efficient multi-keyword searches in a single pass over each string. Use `multiSearchAny()` to filter rows by keyword presence, `multiSearchAnyCaseInsensitive()` to skip manual `lower()` calls, `multiSearchFirstPosition()` to locate the earliest match, and `multiSearchFirstIndex()` to identify which needle matched first. These functions are significantly faster than equivalent `OR position()` chains when you have more than a handful of needles.
