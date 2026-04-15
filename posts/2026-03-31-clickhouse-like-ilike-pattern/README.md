# How to Use like() and ilike() for Pattern Matching in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Pattern Matching, Query Optimization, Analytics

Description: A practical guide to LIKE, ILIKE, notLike, and notILike in ClickHouse for filtering strings by prefix, suffix, and wildcard patterns in WHERE clauses.

---

Pattern matching is one of the most common string operations in analytical queries. ClickHouse supports SQL-standard `LIKE` and its case-insensitive variant `ILIKE`, along with negation forms `notLike()` and `notILike()`. These operators are simpler and often faster than full regular expressions for prefix, suffix, and contains-style filters.

## Wildcard Syntax

`LIKE` patterns use two special characters:

```text
%   matches any sequence of zero or more characters
_   matches exactly one character
```

All other characters in the pattern are matched literally. A `%` at the start of a pattern means "any prefix"; at the end it means "any suffix"; in the middle it means "any substring between two literals".

```sql
-- Matches strings that start with 'error'
SELECT message FROM logs WHERE message LIKE 'error%';

-- Matches strings that end with '.log'
SELECT file_name FROM files WHERE file_name LIKE '%.log';

-- Matches strings that contain 'timeout' anywhere
SELECT message FROM logs WHERE message LIKE '%timeout%';

-- Matches strings with exactly one character followed by 'at'
SELECT word FROM dictionary WHERE word LIKE '_at';
-- matches: 'bat', 'cat', 'hat', 'rat', etc.
```

## Case-Insensitive Matching with ILIKE

`ILIKE` works identically to `LIKE` but performs a case-insensitive comparison. This is useful when the case of stored data is inconsistent or when you want to match user-supplied search terms regardless of capitalization.

```sql
-- Matches 'Error', 'ERROR', 'error', 'eRRoR', etc.
SELECT message FROM logs WHERE message ILIKE 'error%';

-- Matching email domains case-insensitively
SELECT email FROM users WHERE email ILIKE '%@gmail.com';
```

Internally, `ILIKE` lowercases both the haystack and the pattern before comparing. This means it works correctly for ASCII characters. For full Unicode case-insensitive matching, combine `lowerUTF8()` with a lowercased pattern and `LIKE` instead.

## Negation with notLike() and notILike()

`notLike(str, pattern)` returns true when `str` does NOT match the pattern. It is equivalent to `NOT (str LIKE pattern)` but reads more cleanly as a function call in complex expressions.

```sql
-- Exclude rows where the path starts with '/static/'
SELECT * FROM page_views WHERE notLike(url_path, '/static/%');

-- Keep only rows that are not test accounts
SELECT * FROM users WHERE notILike(email, '%@test.%');
```

You can also use the infix NOT LIKE and NOT ILIKE syntax, which is identical in behavior:

```sql
SELECT * FROM page_views WHERE url_path NOT LIKE '/static/%';
SELECT * FROM users WHERE email NOT ILIKE '%@test.%';
```

## Filtering by Prefix

Prefix filters are the most index-friendly form of LIKE. When ClickHouse can determine that a pattern starts with a literal prefix (no leading `%`), it can use a primary key or skip index to prune granules.

```sql
-- Efficient: pattern has a fixed prefix, no leading wildcard
SELECT COUNT(*) FROM events WHERE event_name LIKE 'page_%';

-- Filter log lines from a specific service prefix
SELECT *
FROM application_logs
WHERE logger_name LIKE 'com.example.payments%'
ORDER BY timestamp DESC
LIMIT 100;
```

## Filtering by Suffix

Suffix patterns (leading `%`) require a full scan of the column because there is no prefix to anchor against. They are still useful when the dataset is small or when combined with other selective filters.

```sql
-- Find all files with a specific extension
SELECT file_path, file_size
FROM uploaded_files
WHERE file_path LIKE '%.csv'
  AND upload_date >= today() - 7;
```

## Combining LIKE with Other Predicates

`LIKE` and `ILIKE` compose naturally with `AND`, `OR`, and `IN`:

```sql
-- Find error or warning messages from a specific host
SELECT timestamp, level, message
FROM logs
WHERE host LIKE 'prod-web-%'
  AND (message LIKE '%error%' OR message LIKE '%warning%')
ORDER BY timestamp DESC
LIMIT 50;
```

Use `multiSearchAny()` when you have many substring patterns to test simultaneously (e.g., replacing multiple `LIKE '%…%'` conditions with `OR`) - it is more efficient than chaining individual comparisons. For patterns that require regex (prefix, suffix, or character-class matching), use `multiMatchAny()` with equivalent regex patterns instead.

## Escaping Literal Percent and Underscore

To match a literal `%` or `_` character, escape it with a backslash:

```sql
-- Match strings that literally contain '100%'
SELECT label FROM metrics WHERE label LIKE '%100\%%';

-- Match column names that contain an underscore
SELECT col_name FROM schema_info WHERE col_name LIKE '%\_%';
```

## Using LIKE in Aggregations

Pattern matching in `WHERE` clauses works seamlessly with aggregation:

```sql
-- Count events per event category identified by prefix
SELECT
    replaceRegexpOne(event_name, '^([a-z]+)_.*', '\\1') AS category,
    COUNT(*) AS total
FROM events
WHERE event_name LIKE '%_%'
GROUP BY category
ORDER BY total DESC
LIMIT 10;
```

```sql
-- Summarize HTTP 4xx errors by path prefix
SELECT
    replaceRegexpOne(url_path, '^(/[^/]+).*', '\\1') AS path_root,
    COUNT(*) AS error_count
FROM access_logs
WHERE status_code LIKE '4%'
GROUP BY path_root
ORDER BY error_count DESC
LIMIT 20;
```

## LIKE vs. match() for Complex Patterns

`LIKE` and `ILIKE` are simpler and faster than `match()` (which uses full RE2 regex) for the common cases of prefix, suffix, and contains checks. Use `match()` when you need alternation, character classes, or quantifiers that go beyond what `%` and `_` can express.

```sql
-- Simpler and faster for a plain suffix check
SELECT * FROM files WHERE file_name LIKE '%.json';

-- Use match() only when the pattern is more complex
SELECT * FROM files WHERE match(file_name, '\\.(json|yaml|toml)$');
```

## Summary

`LIKE` matches patterns using `%` (any sequence) and `_` (single character) wildcards with case-sensitive comparison. `ILIKE` is the case-insensitive variant. `notLike()` and `notILike()` negate the match. Prefix patterns without a leading `%` are the most query-efficient form because ClickHouse can use primary key ranges to skip granules. For more expressive pattern matching, `match()` provides full RE2 regex support, but `LIKE` and `ILIKE` remain the right first choice for simple prefix, suffix, and substring filters.
