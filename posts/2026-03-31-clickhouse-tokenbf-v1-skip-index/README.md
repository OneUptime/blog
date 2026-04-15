# How to Use tokenbf_v1 Skip Index for Text Search in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, tokenbf_v1, Skip Index, Full-Text Search, MergeTree

Description: Learn how to create and use the tokenbf_v1 skip index in ClickHouse to accelerate substring and token searches on string columns.

---

`tokenbf_v1` is a token-based Bloom filter skip index in ClickHouse. It splits string values into tokens by treating any non-alphanumeric character as a delimiter, and stores a Bloom filter per granule. Queries using `LIKE`, `hasToken`, or `in` can skip granules that do not contain the searched token.

## When to Use tokenbf_v1

Use `tokenbf_v1` when:
- Searching for whole words or tokens in log lines, messages, or URLs
- Queries use `hasToken()`, `hasTokenCaseInsensitive()`, `LIKE '%word%'`, or `match()`
- Column values are natural-language text or structured identifiers with separators

For substring searches that do not align with token boundaries, prefer `ngrambf_v1` instead.

## Creating a tokenbf_v1 Index

```sql
CREATE TABLE logs (
    log_time  DateTime,
    level     String,
    message   String,
    INDEX idx_message message TYPE tokenbf_v1(65536, 3, 0) GRANULARITY 1
) ENGINE = MergeTree()
ORDER BY (log_time);
```

Parameters:
- `65536` - Bloom filter size in bytes per granule
- `3` - number of hash functions
- `0` - seed for the hash functions

## Adding to an Existing Table

```sql
ALTER TABLE logs
    ADD INDEX idx_message message TYPE tokenbf_v1(65536, 3, 0) GRANULARITY 1;

-- Materialize on existing data
ALTER TABLE logs MATERIALIZE INDEX idx_message;
```

## Querying with hasToken

```sql
-- Fast: tokenbf_v1 can skip non-matching granules
SELECT log_time, level, message
FROM logs
WHERE hasToken(message, 'OutOfMemory')
  AND log_time >= now() - INTERVAL 1 HOUR
```

## Querying with LIKE

```sql
-- Also benefits from tokenbf_v1 when the pattern contains whole tokens
SELECT count() FROM logs WHERE message LIKE '%connection refused%'
```

## Checking Index Usage

Use `EXPLAIN indexes=1` to verify the index is being applied:

```sql
EXPLAIN indexes=1
SELECT count() FROM logs WHERE hasToken(message, 'timeout')
```

Look for `tokenbf_v1` in the output with a non-zero number of skipped granules.

## Index Size and False Positives

Bloom filters have a false-positive rate. A larger filter size reduces false positives but uses more memory at query time. As a rule of thumb, size the filter at 1-2 bytes per expected unique token per granule.

```sql
SELECT
    formatReadableSize(sum(secondary_indices_compressed_bytes)) AS index_size
FROM system.parts
WHERE table = 'logs' AND active = 1
```

## Summary

`tokenbf_v1` accelerates token-level text searches in ClickHouse MergeTree tables. Add it to string columns searched with `hasToken()` or whole-word `LIKE` patterns. Tune the Bloom filter size and hash function count to balance skip effectiveness against false-positive rate.
