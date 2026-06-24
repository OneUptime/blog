# How to Use replace() and replaceAll() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Data Cleaning, Analytics

Description: Learn how replace() and replaceAll() work in ClickHouse to clean, normalize, and redact string data, with practical examples for real-world use cases.

---

ClickHouse provides two core functions for string substitution: `replaceOne()` and `replaceAll()`. They share the same signature but differ in how many occurrences they target. Understanding the distinction helps you apply the right tool whether you are cleaning raw input, normalizing formats, or redacting sensitive fields before storage. Note that `replace()` is an alias for `replaceAll()` in ClickHouse, not a first-occurrence function as in some other databases.

## The Difference Between replaceOne() and replaceAll()

`replaceOne(str, from, to)` scans a string and replaces only the first occurrence of the substring `from` with `to`. Once the first match is found, the scan stops.

`replaceAll(str, from, to)` replaces every non-overlapping occurrence of `from` with `to` from left to right. `replace()` is an alias for `replaceAll()`.

Both functions are case-sensitive and work on byte sequences, not Unicode code points. If you need Unicode-aware replacement, combine them with `lowerUTF8()` or other UTF-8 aware functions as a preprocessing step.

```sql
-- replaceOne() substitutes only the first match
SELECT replaceOne('aaa', 'a', 'b') AS result;
-- result: 'baa'

-- replaceAll() substitutes every match
SELECT replaceAll('aaa', 'a', 'b') AS result;
-- result: 'bbb'
```

## Cleaning Raw Data

Log pipelines and ETL processes often receive strings that contain noise: repeated separators, stray punctuation, or encoding artifacts. `replaceAll()` is the workhorse for stripping or normalizing these patterns.

The example below removes all tab characters from an imported CSV field before further processing:

```sql
SELECT replaceAll(raw_field, '\t', '') AS cleaned
FROM import_staging
LIMIT 10;
```

To strip multiple different characters, chain the calls:

```sql
SELECT
    replaceAll(
        replaceAll(raw_field, '\t', ''),
        '\r', ''
    ) AS cleaned
FROM import_staging
LIMIT 10;
```

For more complex multi-pattern replacements, `replaceRegexpAll()` is a better fit, but for simple literal substitutions chaining `replaceAll()` is readable and fast.

## Normalizing Formats

Phone numbers, identifiers, and codes often arrive in inconsistent formats. `replaceAll()` lets you strip formatting characters to produce a canonical form suitable for joining or indexing.

The following query normalizes US phone numbers by removing parentheses, hyphens, and spaces:

```sql
SELECT
    phone_raw,
    replaceAll(
        replaceAll(
            replaceAll(
                replaceAll(phone_raw, '(', ''),
            ')', ''),
        '-', ''),
    ' ', '') AS phone_normalized
FROM users
LIMIT 5;
```

You can also normalize URL schemes so that HTTP and HTTPS variants of the same host are treated identically:

```sql
SELECT replaceOne(url, 'http://', 'https://') AS normalized_url
FROM page_views
WHERE url LIKE 'http://%'
LIMIT 10;
```

Here `replaceOne()` is sufficient because each URL begins with exactly one scheme prefix. Using `replaceAll()` would work too, but `replaceOne()` makes the intent explicit: there is only one occurrence to fix.

## Redacting PII Before Storage

Before writing sensitive data to an analytics table, you can mask specific field values. The `replaceOne()` and `replaceAll()` functions give you a fast, in-query redaction path without requiring a preprocessing pipeline.

The following example redacts a known email domain in a comments column:

```sql
SELECT
    comment_id,
    replaceAll(comment_text, 'user@example.com', '[REDACTED]') AS safe_text
FROM comments
LIMIT 20;
```

For partial masking, such as keeping only the first four digits of a card number visible, you would use `replaceRegexpAll()` with a capture group. But when the value to redact is a known literal string, `replaceAll()` is the simplest choice.

## Using replaceAll() in INSERT Pipelines

Both functions work inside `INSERT ... SELECT` statements, making it straightforward to clean data at ingestion time rather than at query time:

```sql
INSERT INTO users_clean (user_id, email, phone)
SELECT
    user_id,
    replaceAll(lower(email), ' ', '') AS email,
    replaceAll(
        replaceAll(
            replaceAll(phone, '-', ''),
        ' ', ''),
    '.', '') AS phone
FROM users_raw;
```

Running the transformation at write time means your analytical queries pay no per-query cleaning cost.

## Replacing Substrings in Array Elements

When a column holds an array of strings, wrap `replaceAll()` inside `arrayMap()` to apply the substitution element-wise:

```sql
SELECT
    arrayMap(tag -> replaceAll(tag, '_', '-'), tags) AS normalized_tags
FROM events
LIMIT 5;
```

This converts underscore-delimited tags like `error_rate` into hyphen-delimited equivalents like `error-rate` across the entire array in a single expression.

## Performance Considerations

Both `replaceOne()` and `replaceAll()` perform simple byte-string matching and are very fast for short, literal substrings. They do not compile a regex engine, so they have lower overhead than `replaceRegexpAll()` for fixed-string patterns.

When your substitution pattern is dynamic and comes from another column, both functions accept column references as arguments:

```sql
SELECT replaceAll(message, pattern_col, replacement_col) AS result
FROM transformations;
```

ClickHouse evaluates this per row, so the pattern does not need to be a constant.

## Summary

`replaceOne(str, from, to)` replaces only the first occurrence of a substring, while `replaceAll(str, from, to)` replaces every occurrence. `replace()` is an alias for `replaceAll()`, not a first-occurrence function. Use `replaceOne()` when you know there is at most one instance to fix - such as a URL scheme prefix - and `replaceAll()` when you need to eliminate or substitute a pattern throughout the entire string. Both functions accept column references as arguments, integrate cleanly into `INSERT ... SELECT` pipelines, and compose well with `arrayMap()` for operating on array columns. For pattern-based replacements, reach for `replaceRegexpOne()` or `replaceRegexpAll()` instead.
