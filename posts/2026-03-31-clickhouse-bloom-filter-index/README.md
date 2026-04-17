# How to Use Bloom Filter Index in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Index, BloomFilter, Database, Performance, Query

Description: Learn how to use Bloom filter skip indexes in ClickHouse to accelerate equality and IN queries on high-cardinality string and UUID columns.

---

The Bloom filter skip index stores a probabilistic membership structure for each skip index block. When a query filters with `=` or `IN`, ClickHouse checks each block's bloom filter and skips blocks where membership is definitely false. Unlike the Set index, Bloom filter handles high-cardinality columns efficiently because it stores only a small fixed number of bits per distinct value (roughly 10 bits at 1% FPR) rather than each full value.

## How Bloom Filters Work

A Bloom filter is a fixed-size bit array initialized to zero. When inserting a value, several hash functions set bits at corresponding positions. To test membership, the same hashes are checked. If all bits are set, the value *may* be present. If any bit is unset, the value is *definitely not* present.

This produces:

- No false negatives (a matching value is never incorrectly skipped)
- Tunable false positive rate (non-matching blocks may be read, but at a controlled rate)

## Index Variants

ClickHouse provides three bloom filter index types:

| Index type | Works on | Description |
|------------|----------|-------------|
| `bloom_filter` | All types | Standard bloom filter |
| `ngrambf_v1` | String | Bloom filter over n-grams (enables LIKE queries) |
| `tokenbf_v1` | String | Bloom filter over whitespace-delimited tokens |

This post focuses on `bloom_filter`. See the dedicated posts for ngram and token variants.

## Creating a Bloom Filter Index

```sql
CREATE TABLE user_actions
(
    user_id      UUID,
    session_id   String,
    action       String,
    page_url     String,
    ts           DateTime,

    INDEX idx_user_id   user_id    TYPE bloom_filter(0.01) GRANULARITY 4,
    INDEX idx_session   session_id TYPE bloom_filter(0.01) GRANULARITY 4,
    INDEX idx_page      page_url   TYPE bloom_filter(0.01) GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (ts, user_id);
```

`bloom_filter(false_positive_rate)` accepts a decimal between 0 and 1 (default: `0.025` when omitted). Lower rates reduce false positives but require more memory.

## Queries That Benefit

```sql
-- Equality lookup
SELECT count()
FROM user_actions
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';

-- IN filter
SELECT action, count()
FROM user_actions
WHERE user_id IN (
    '550e8400-e29b-41d4-a716-446655440000',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
)
GROUP BY action;

-- String equality
SELECT *
FROM user_actions
WHERE session_id = 'sess_abc123'
ORDER BY ts;
```

## Verifying Bloom Filter Usage

```sql
EXPLAIN indexes = 1
SELECT count()
FROM user_actions
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
```

Example output:

```text
Skip
  Name: idx_user_id
  Description: bloom_filter(0.01) GRANULARITY 4
  Granules: 2/500
```

498 out of 500 granules skipped.

## False Positive Rate Tuning

The false positive rate directly determines how often ClickHouse reads a granule that does not actually contain the target value:

| Rate | Memory per entry | False positives |
|------|-----------------|-----------------|
| 0.1 | Low | 10% |
| 0.01 | Moderate | 1% |
| 0.001 | Higher | 0.1% |

For most workloads, `0.01` (1%) is a good default. Reduce to `0.001` if your queries hit the same bloom filter frequently and you want to minimize unnecessary I/O.

```sql
INDEX idx_user_id user_id TYPE bloom_filter(0.001) GRANULARITY 4
```

## Adding to an Existing Table

```sql
ALTER TABLE user_actions
    ADD INDEX idx_action action TYPE bloom_filter(0.01) GRANULARITY 4;

ALTER TABLE user_actions
    MATERIALIZE INDEX idx_action;
```

## Bloom Filter vs Set Index

| Criterion | bloom_filter | set(N) |
|-----------|-------------|--------|
| High cardinality | Excellent | Overflows |
| Low cardinality | Works but wasteful | Ideal |
| False positives | Tunable | None |
| Memory per element | ~10 bits at 1% FPR | Full stored value |
| Supports `hasToken` | No (use tokenbf_v1) | No |
| Supports `LIKE` | No (use ngrambf_v1) | No |

## Bloom Filter on Numeric Columns

Bloom filter also works on integer and float columns:

```sql
CREATE TABLE payments
(
    payment_id    UInt64,
    merchant_id   UInt32,
    amount_cents  UInt64,
    ts            DateTime,

    INDEX idx_merchant merchant_id TYPE bloom_filter(0.01) GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (ts, payment_id);
```

For range queries on numeric columns, use `minmax` instead. Bloom filter only helps with exact equality.

## Index Size

```sql
SELECT
    name,
    type,
    formatReadableSize(data_compressed_bytes) AS index_size
FROM system.data_skipping_indices
WHERE table = 'user_actions'
  AND database = currentDatabase();
```

## Full Example with Benchmark

```sql
-- Without index
CREATE TABLE events_no_idx (user_id String, ts DateTime) ENGINE = MergeTree() ORDER BY ts;

-- With bloom filter
CREATE TABLE events_bloom (
    user_id String,
    ts      DateTime,
    INDEX idx_uid user_id TYPE bloom_filter(0.01) GRANULARITY 4
) ENGINE = MergeTree() ORDER BY ts;

INSERT INTO events_no_idx  SELECT generateUUIDv4(), now() - rand() % 864000 FROM numbers(10000000);
INSERT INTO events_bloom   SELECT generateUUIDv4(), now() - rand() % 864000 FROM numbers(10000000);

-- Pick a real UUID from the table
SELECT user_id FROM events_bloom LIMIT 1;

-- Run against both and compare read_rows in system.query_log
SELECT count() FROM events_no_idx WHERE user_id = '<uuid>';
SELECT count() FROM events_bloom  WHERE user_id = '<uuid>';
```

## Summary

Bloom filter indexes are the right choice for high-cardinality string, UUID, and integer columns used in equality or IN filters. Tune the false positive rate to balance index size against I/O overhead. For range queries, use `minmax`. For substring matching, use `ngrambf_v1`. Always verify with `EXPLAIN indexes = 1`.
