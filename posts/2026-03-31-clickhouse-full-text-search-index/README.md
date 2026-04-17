# How to Use Full-Text Search Index in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Index, FULLTEXT, Search, Database, Performance

Description: Learn how to use ClickHouse full-text search indexes including tokenbf_v1 and ngrambf_v1 to accelerate LIKE and hasToken queries on string columns.

---

ClickHouse provides two bloom-filter-based skip indexes for accelerating text search: `ngrambf_v1` for substring matching and `tokenbf_v1` for token-based matching. These indexes allow ClickHouse to skip entire granules when the search term is definitively absent, dramatically reducing the number of rows scanned for LIKE queries and `hasToken` calls.

## The Two Full-Text Index Types

### ngrambf_v1

Stores a bloom filter of all n-grams (character substrings of length n) found in the column. Enables:

- `LIKE '%substring%'` and `notLike`
- `startsWith` / `endsWith`
- Equality comparisons and `match`

### tokenbf_v1

Stores a bloom filter of whitespace-delimited tokens. Enables:

- `hasToken(col, 'word')`
- Equality comparisons on tokenized content
- Word-boundary searches

## Creating an ngrambf_v1 Index

Syntax:

```sql
INDEX name col TYPE ngrambf_v1(ngram_size, bloom_filter_size, hash_functions, seed) GRANULARITY n
```

Parameters:

| Parameter | Typical value | Description |
|-----------|--------------|-------------|
| ngram_size | 3 or 4 | Length of each n-gram |
| bloom_filter_size | 65536 | Size of the bloom filter in bytes |
| hash_functions | 2 | Number of hash functions |
| seed | 0 | Hash seed |

```sql
CREATE TABLE log_messages
(
    service_id  UInt16,
    level       LowCardinality(String),
    message     String,
    ts          DateTime,

    INDEX idx_msg_ngram message TYPE ngrambf_v1(4, 65536, 2, 0) GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (service_id, ts);
```

## Creating a tokenbf_v1 Index

Syntax:

```sql
INDEX name col TYPE tokenbf_v1(bloom_filter_size, hash_functions, seed) GRANULARITY n
```

```sql
CREATE TABLE search_content
(
    doc_id    UInt64,
    title     String,
    body      String,
    ts        DateTime,

    INDEX idx_body_token body  TYPE tokenbf_v1(65536, 2, 0) GRANULARITY 4,
    INDEX idx_title_token title TYPE tokenbf_v1(32768, 2, 0) GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (ts, doc_id);
```

## Queries That Use ngrambf_v1

```sql
-- Substring search (uses ngrambf_v1)
SELECT message, ts
FROM log_messages
WHERE message LIKE '%OutOfMemoryError%'
ORDER BY ts DESC
LIMIT 50;

-- Case-insensitive requires ilike (check ClickHouse version)
SELECT message
FROM log_messages
WHERE message ILIKE '%connection refused%';

-- startsWith / endsWith (uses ngrambf_v1)
SELECT count()
FROM log_messages
WHERE startsWith(message, 'ERROR');
```

## Queries That Use tokenbf_v1

```sql
-- hasToken function (exact word boundary match)
SELECT doc_id, title
FROM search_content
WHERE hasToken(body, 'clickhouse')
ORDER BY ts DESC;

-- Multiple token search
SELECT doc_id
FROM search_content
WHERE hasToken(body, 'performance')
  AND hasToken(body, 'optimization');
```

## Verifying Index Usage

```sql
EXPLAIN indexes = 1
SELECT count()
FROM log_messages
WHERE message LIKE '%OutOfMemoryError%';
```

Example output:

```text
Skip
  Name: idx_msg_ngram
  Description: ngrambf_v1(4, 65536, 2, 0) GRANULARITY 4
  Granules: 5/1000
```

## Adding Indexes to an Existing Table

```sql
ALTER TABLE log_messages
    ADD INDEX idx_msg_token message TYPE tokenbf_v1(65536, 2, 0) GRANULARITY 4;

ALTER TABLE log_messages
    MATERIALIZE INDEX idx_msg_token;
```

## Tuning ngram_size

Larger n-grams are more selective but require the full n-gram to be present in the string:

- `n=3`: Matches any substring of 3+ chars. Broad coverage, more false positives.
- `n=4`: Better selectivity for most log strings.
- `n=6`: Very selective; only useful for long, specific search terms.

For log analysis (searching for exception class names, error codes), `n=4` is a good default.

## Tuning bloom_filter_size

The bloom filter size in bytes controls the false positive rate:

- Smaller size: more collisions, higher false positive rate, smaller index
- Larger size: fewer collisions, lower false positive rate, larger index

A 65536-byte (64KB) filter per granule is a practical default. For very short strings or small tables, 8192 or 16384 bytes may suffice.

## ngrambf_v1 vs tokenbf_v1

| Feature | ngrambf_v1 | tokenbf_v1 |
|---------|-----------|-----------|
| Pattern type | Substrings (n-grams) | Words (tokens) |
| LIKE support | Yes | No |
| hasToken support | No | Yes |
| False positive for short terms | Higher | Lower |
| Use case | Log search, URL matching | Document search, NLP |

## Combining Both on One Column

```sql
CREATE TABLE rich_logs
(
    id      UInt64,
    message String,
    ts      DateTime,

    INDEX idx_ngram message TYPE ngrambf_v1(4, 65536, 2, 0) GRANULARITY 4,
    INDEX idx_token message TYPE tokenbf_v1(65536, 2, 0)    GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (ts, id);
```

ClickHouse selects the appropriate index based on the query type.

## Performance Expectations

On a 100M-row log table, full-text indexes typically reduce scanned rows by 90-99% for selective search terms. Terms that appear in almost every granule provide no pruning. Use `EXPLAIN indexes = 1` to check.

## Summary

Use `ngrambf_v1` for `LIKE '%substring%'` style queries and `tokenbf_v1` for word-boundary token searches. Tune the ngram size, bloom filter size, and granularity based on your string lengths and search patterns. Always verify with `EXPLAIN indexes = 1` that granules are being pruned before deploying to production.
