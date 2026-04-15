# How to Optimize LIKE and Regex Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, LIKE, Regex, Full-Text Search, Skip Index, Performance, tokenbf_v1

Description: Learn how to speed up LIKE and regex pattern matching in ClickHouse using bloom filter skip indexes, token indexes, and query rewriting strategies.

---

String pattern matching with `LIKE` and regex (`match()`) in ClickHouse scans every granule by default. At scale, this means reading gigabytes of data for a single pattern search. This guide shows how to make it fast.

## Why LIKE is Slow Without Indexes

ClickHouse's sparse primary index is range-based and cannot accelerate substring searches. `LIKE '%error%'` must evaluate every row in every granule touched by the query.

```sql
-- Full column scan on the log_line column
SELECT count() FROM logs WHERE log_line LIKE '%NullPointerException%';
```

## Add a Token Bloom Filter Skip Index

The `tokenbf_v1` skip index tokenizes strings by non-alphanumeric delimiters and stores a bloom filter per granule group. Queries with word-boundary tokens skip granule groups that cannot contain the token:

```sql
ALTER TABLE logs
ADD INDEX idx_log_line log_line TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1;

ALTER TABLE logs MATERIALIZE INDEX idx_log_line;
```

```sql
-- Now benefits from the token bloom filter
SELECT count() FROM logs WHERE log_line LIKE '%NullPointerException%';
```

The three parameters are: bloom filter size in bytes, number of hash functions, and seed. Start with `(32768, 3, 0)`.

## Use ngrambf_v1 for Substring Searches

For arbitrary substring matching (not word-boundary tokens), use the n-gram bloom filter:

```sql
ALTER TABLE logs
ADD INDEX idx_ngram log_line TYPE ngrambf_v1(4, 32768, 3, 0) GRANULARITY 1;
```

N-gram size of 4 means every 4-character substring is hashed. A pattern of length >= 4 can benefit from this index.

## Use hasToken() Instead of LIKE for Word Matches

`hasToken()` uses the same tokenization as `tokenbf_v1` and is faster than LIKE for whole-word matches:

```sql
-- Faster than: WHERE log_line LIKE '%Exception%'
SELECT count() FROM logs WHERE hasToken(log_line, 'Exception');
```

## Anchor Regex to the Left When Possible

Left-anchored regex (`^prefix`) is faster than unanchored because the regex engine only needs to test at the start of each string value instead of at every position:

```sql
-- Faster: left-anchored
SELECT count() FROM logs WHERE match(log_line, '^ERROR');

-- Slower: unanchored substring
SELECT count() FROM logs WHERE match(log_line, 'ERROR');
```

## Use multiSearchAny for Multiple Patterns

Instead of multiple LIKE conditions with OR, use `multiSearchAny` which matches multiple substrings in a single pass:

```sql
SELECT count() FROM logs
WHERE multiSearchAny(log_line, ['NullPointerException', 'OutOfMemoryError', 'StackOverflow']);
```

Use `multiMatchAny` instead if you need regex patterns rather than literal substrings.

## Avoid LIKE on High-Cardinality Extracted Columns

If you frequently search for a structured field embedded in a string, extract it at ingest time:

```sql
-- Extract at write time
ALTER TABLE logs ADD COLUMN error_class String
    MATERIALIZED extract(log_line, '(\\w+Exception)');

-- Then index and query the extracted column
ALTER TABLE logs ADD INDEX idx_error_class (error_class) TYPE bloom_filter GRANULARITY 1;
SELECT count() FROM logs WHERE error_class = 'NullPointerException';
```

## Summary

Optimizing LIKE and regex queries in ClickHouse requires adding `tokenbf_v1` or `ngrambf_v1` skip indexes on text columns, using `hasToken()` for word-boundary matches, and `multiSearchAny()` for multi-pattern substring searches. For structured data embedded in strings, extract fields at ingest time and index the extracted column directly.
