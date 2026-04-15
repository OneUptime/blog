# How to Use Regular Expressions for Data Extraction in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Regular Expression, Data Extraction, String Function, Analytics

Description: Learn how to use ClickHouse regex functions like extract, extractAll, and replaceRegexpOne to parse and transform unstructured text data.

---

ClickHouse ships with a powerful set of regex functions backed by the RE2 library. These functions let you extract structured fields from raw log lines, URLs, and free-text columns without any preprocessing step.

## Extracting a Single Match with extract

`extract(haystack, pattern)` returns the first capturing group matched by `pattern`.

```sql
SELECT extract(url, 'https?://([^/]+)') AS host
FROM page_views
LIMIT 5;
```

If the pattern does not match, the function returns an empty string.

## Extracting All Matches with extractAll

`extractAll(haystack, pattern)` returns an array of all non-overlapping matches. When the pattern contains a capturing group, it returns the captured substrings rather than the full matches.

```sql
SELECT extractAll(log_line, '\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}') AS ip_addresses
FROM access_logs
WHERE length(ip_addresses) > 0;
```

This is useful for pulling multiple IP addresses or tokens from a single text field.

## Replacing Text with replaceRegexpOne and replaceRegexpAll

```sql
-- Mask credit card numbers
SELECT replaceRegexpAll(payment_data, '\d{12,16}', '****') AS masked
FROM transactions;

-- Normalize URL paths by stripping UUIDs
SELECT replaceRegexpAll(
    path,
    '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
    ':id'
) AS normalized_path
FROM http_logs;
```

## Splitting Strings by Pattern

`splitByRegexp(pattern, str)` splits a string into an array:

```sql
SELECT splitByRegexp('[,;|]+', tags_column) AS tag_array
FROM articles;
```

## Testing a Match with match

`match(haystack, pattern)` returns 1 if the string matches, 0 otherwise:

```sql
SELECT count()
FROM emails
WHERE match(address, '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$') = 1;
```

## Performance Notes

RE2 regex compilation happens once per query. For high-frequency filters, consider extracting the value into a materialized column so the regex only runs at insert time:

```sql
ALTER TABLE access_logs
ADD COLUMN host String MATERIALIZED extract(url, 'https?://([^/]+)');
```

## Summary

ClickHouse provides `extract`, `extractAll`, `replaceRegexpOne`, `replaceRegexpAll`, `splitByRegexp`, and `match` for regex-driven data work. Materialize frequently accessed regex results to avoid repeated runtime evaluation.
