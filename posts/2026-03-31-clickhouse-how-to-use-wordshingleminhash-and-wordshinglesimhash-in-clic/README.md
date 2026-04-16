# How to Use wordShingleMinHash() and wordShingleSimHash() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Text Similarity, MinHash, SimHash, Near-Duplicate Detection, SQL

Description: Learn how to use wordShingleMinHash() and wordShingleSimHash() in ClickHouse to detect near-duplicate text documents using locality-sensitive hashing.

---

## Overview

ClickHouse provides locality-sensitive hashing (LSH) functions for approximate text similarity. `wordShingleMinHash()` computes a MinHash signature from word n-grams (shingles), and `wordShingleSimHash()` computes a SimHash fingerprint. Both are used for near-duplicate document detection at scale.

## Understanding Shingles

A shingle (or n-gram) is a contiguous sequence of `n` words from a text. For example, with shingle size 3, the text "the quick brown fox" produces: `["the quick brown", "quick brown fox"]`.

MinHash and SimHash operate on these shingle sets to produce compact signatures that preserve similarity.

## wordShingleMinHash()

```sql
SELECT wordShingleMinHash('the quick brown fox jumps over the lazy dog', 3, 1) AS minhash
```

Signature: `wordShingleMinHash(text, shingle_size, hash_count)` returns a `Tuple(UInt64, UInt64)` — the minimum and maximum hash values. The `hash_count` parameter controls how many min/max hashes are computed internally before being aggregated into the two returned values.

For near-duplicate detection, compare hashes from two texts with `tupleHammingDistance`:

```sql
SELECT
    tupleHammingDistance(
        wordShingleMinHash('ClickHouse is a fast analytical database', 3, 1),
        wordShingleMinHash('ClickHouse is a fast analytical database system', 3, 1)
    ) AS dist
```

## wordShingleSimHash()

`wordShingleSimHash()` produces a single UInt64 SimHash. Texts with similar content will have SimHash values that differ in very few bits.

```sql
SELECT wordShingleSimHash('the quick brown fox') AS simhash
```

The bitHammingDistance between two SimHashes indicates how similar two texts are:

```sql
SELECT
    wordShingleSimHash('ClickHouse is fast') AS h1,
    wordShingleSimHash('ClickHouse is very fast') AS h2,
    bitHammingDistance(
        wordShingleSimHash('ClickHouse is fast'),
        wordShingleSimHash('ClickHouse is very fast')
    ) AS hamming_dist
```

A small Hamming distance (e.g., under 5) typically indicates near-duplicate texts.

## Using These Functions in Tables

```sql
CREATE TABLE articles
(
    article_id  UInt64,
    title       String,
    body        String,
    body_simhash UInt64 MATERIALIZED wordShingleSimHash(body)
)
ENGINE = MergeTree()
ORDER BY article_id;
```

With a materialized column for SimHash, you can efficiently run similarity queries:

```sql
SELECT
    a1.article_id AS id1,
    a2.article_id AS id2,
    bitHammingDistance(a1.body_simhash, a2.body_simhash) AS dist
FROM articles a1
CROSS JOIN articles a2
WHERE a1.article_id < a2.article_id
  AND bitHammingDistance(a1.body_simhash, a2.body_simhash) <= 4
```

## Case-Insensitive and UTF-8 Variants

ClickHouse provides UTF-8-aware and case-insensitive variants:

```sql
SELECT wordShingleSimHashCaseInsensitive('Quick BROWN Fox') AS ci_hash
SELECT wordShingleSimHashCaseInsensitiveUTF8('Cher ami') AS utf8_hash
SELECT wordShingleMinHashCaseInsensitive('Quick Brown Fox', 3, 1) AS ci_minhash
```

## Detecting Duplicate News Articles

A practical deduplication pipeline:

```sql
-- Step 1: Insert articles with precomputed hashes
INSERT INTO articles (article_id, title, body) VALUES
(1, 'ClickHouse Performance', 'ClickHouse is a fast OLAP database designed for analytics'),
(2, 'ClickHouse Speed', 'ClickHouse is a very fast OLAP database for analytics');

-- Step 2: Find near-duplicates
SELECT
    a.article_id AS id1,
    b.article_id AS id2,
    bitHammingDistance(a.body_simhash, b.body_simhash) AS dist
FROM articles a
JOIN articles b ON a.article_id < b.article_id
WHERE dist <= 6
ORDER BY dist
```

## MinHash Similarity with tupleHammingDistance

For approximate similarity using MinHash, compare the returned tuples with `tupleHammingDistance`:

```sql
SELECT
    tupleHammingDistance(
        wordShingleMinHash(text1, 3, 6),
        wordShingleMinHash(text2, 3, 6)
    ) AS dist
FROM text_pairs
```

Since `wordShingleMinHash` returns a `Tuple(UInt64, UInt64)` (aggregated min and max hashes), `tupleHammingDistance` returns a value between 0 and 2 — 0 means both min and max hashes match. Increasing `hash_count` (up to 25) increases the number of hashes considered when selecting these aggregated min/max values.

## Summary

`wordShingleSimHash()` produces a compact `UInt64` SimHash for fast approximate similarity using `bitHammingDistance`, while `wordShingleMinHash()` produces a `Tuple(UInt64, UInt64)` MinHash signature compared via `tupleHammingDistance`. Both functions support UTF-8 and case-insensitive variants. Use materialized columns to precompute hashes and enable efficient near-duplicate detection at query time.
