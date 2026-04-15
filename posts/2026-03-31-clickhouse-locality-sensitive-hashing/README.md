# How to Implement Locality-Sensitive Hashing in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Locality-Sensitive Hashing, Similarity, MinHash, Analytics

Description: Learn how to implement locality-sensitive hashing in ClickHouse using MinHash and wordShingle functions to find similar documents at scale.

---

Locality-Sensitive Hashing (LSH) enables approximate nearest-neighbor search by mapping similar items to the same bucket with high probability. ClickHouse provides MinHash-based functions that implement LSH for text similarity.

## Using ngramMinHash

`ngramMinHash(string[, ngramsize, hashnum])` computes a MinHash signature for a string. The `ngramsize` parameter (default 3) sets the n-gram length, and `hashnum` (default 6, max 25) controls how many min/max hashes are used:

```sql
SELECT
    doc_id,
    ngramMinHash(content, 4, 6) AS minhash
FROM documents
LIMIT 5;
```

The result is a `Tuple(UInt64, UInt64)` containing the minimum and maximum hash values.

## Computing Similarity Between Documents

Use `ngramSimHash` with `bitHammingDistance` to score pairwise document similarity:

```sql
SELECT
    a.doc_id AS doc_a,
    b.doc_id AS doc_b,
    ngramSimHash(a.content, 4) AS hash_a,
    ngramSimHash(b.content, 4) AS hash_b,
    bitHammingDistance(ngramSimHash(a.content, 4), ngramSimHash(b.content, 4)) AS hamming_dist
FROM documents a
CROSS JOIN documents b
WHERE a.doc_id < b.doc_id
  AND hamming_dist <= 3
ORDER BY hamming_dist;
```

Low Hamming distance on SimHash indicates high document similarity.

## Using wordShingleMinHash for Near-Duplicate Detection

```sql
SELECT
    doc_id,
    title,
    wordShingleMinHash(content, 3, 6) AS wsmh
FROM articles
LIMIT 10;
```

Group by the hash to find near-duplicates:

```sql
SELECT
    wordShingleMinHash(content, 3, 6) AS bucket,
    groupArray(doc_id) AS duplicate_ids,
    count() AS cnt
FROM articles
GROUP BY bucket
HAVING cnt > 1
ORDER BY cnt DESC;
```

## Storing and Querying LSH Buckets

Materialize LSH buckets for efficient lookup:

```sql
ALTER TABLE articles
ADD COLUMN lsh_bucket UInt64
    MATERIALIZED cityHash64(wordShingleMinHash(content, 3, 6));

ALTER TABLE articles
ADD INDEX idx_lsh lsh_bucket TYPE bloom_filter GRANULARITY 1;
```

Then query for candidates:

```sql
SELECT doc_id, title
FROM articles
WHERE lsh_bucket = (
    SELECT cityHash64(wordShingleMinHash({query_text:String}, 3, 6))
);
```

## Summary

ClickHouse implements LSH through `ngramMinHash`, `ngramSimHash`, and `wordShingleMinHash`. Use Hamming distance on SimHash for similarity scoring, and materialize LSH bucket columns with bloom filter indexes to enable fast approximate duplicate detection at scale.
