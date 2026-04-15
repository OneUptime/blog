# How to Use wordShingleMinHash() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, MinHash, Near-Duplicate Detection, Text Analysis

Description: Learn how to use wordShingleMinHash() and wordShingleSimHash() in ClickHouse for near-duplicate document detection and content deduplication.

---

`wordShingleMinHash()` and `wordShingleSimHash()` are locality-sensitive hash functions that operate on word shingles (n-grams of words). Unlike regular hash functions that produce completely different outputs for slightly different inputs, MinHash and SimHash are designed so that similar texts produce similar hash values. This makes them ideal for near-duplicate document detection and content clustering.

## Understanding Word Shingles

A word shingle is a sequence of consecutive words. For example, the shingles of size 2 from "the quick brown fox" are: "the quick", "quick brown", "brown fox".

```sql
-- Basic wordShingleMinHash usage
-- Returns a tuple of two UInt64 values representing the MinHash signature
SELECT wordShingleMinHash('the quick brown fox jumps', 3, 1) AS minhash_signature;

-- The function returns (UInt64, UInt64) - a tuple
SELECT
    doc_id,
    wordShingleMinHash(content, 3, 1) AS minhash_sig
FROM documents
LIMIT 5;
```

The parameters are:
```text
wordShingleMinHash(string[, shinglesize, hashnum])
```

## Basic Similarity Detection

Two documents are near-duplicates if their MinHash signatures are close. Compare the tuples to detect similarity.

```sql
-- Find pairs of documents with identical MinHash signatures
SELECT
    a.doc_id AS doc_a,
    b.doc_id AS doc_b,
    a.minhash_sig
FROM (
    SELECT doc_id, wordShingleMinHash(content, 3, 1) AS minhash_sig
    FROM documents
) AS a
JOIN (
    SELECT doc_id, wordShingleMinHash(content, 3, 1) AS minhash_sig
    FROM documents
) AS b
ON a.minhash_sig = b.minhash_sig AND a.doc_id < b.doc_id
LIMIT 20;
```

## Using wordShingleSimHash

`wordShingleSimHash()` computes a SimHash, which produces a single UInt64. Documents with similar content produce hashes that differ in only a few bits (low Hamming distance).

```sql
-- Compute SimHash for documents
SELECT
    doc_id,
    title,
    wordShingleSimHash(content, 3) AS simhash
FROM documents
LIMIT 10;
```

## Content Deduplication Pipeline

Use MinHash to deduplicate a large corpus of documents. Group documents with the same signature as likely duplicates.

```sql
-- Group documents by MinHash signature to find near-duplicates
SELECT
    wordShingleMinHash(content, 4, 1) AS sig,
    count()                            AS doc_count,
    groupArray(doc_id)                 AS duplicate_doc_ids
FROM documents
GROUP BY sig
HAVING doc_count > 1
ORDER BY doc_count DESC
LIMIT 20;
```

## Deduplication with wordShingleMinHashCaseInsensitive

For case-insensitive matching, ClickHouse provides a case-insensitive variant.

```sql
-- Case-insensitive near-duplicate detection
SELECT
    doc_id,
    wordShingleMinHashCaseInsensitive(content, 3, 1) AS ci_sig
FROM documents
LIMIT 10;

-- Find duplicates ignoring case differences
SELECT
    wordShingleMinHashCaseInsensitive(content, 3, 1) AS sig,
    count()                                           AS doc_count,
    groupArray(doc_id)                                AS doc_ids
FROM documents
GROUP BY sig
HAVING doc_count > 1
ORDER BY doc_count DESC
LIMIT 10;
```

## Similar Document Clustering

Use the MinHash signature as a cluster ID to group similar documents together.

```sql
-- Assign each document to a cluster based on its MinHash
SELECT
    doc_id,
    title,
    wordShingleMinHash(content, 3, 1) AS cluster_id
FROM documents
ORDER BY cluster_id
LIMIT 20;
```

## Detecting Plagiarism

Compare article content to find articles that are substantially similar.

```sql
-- Find pairs of articles that are likely plagiarized
SELECT
    a.article_id AS original,
    b.article_id AS possible_copy,
    a.author     AS original_author,
    b.author     AS copy_author
FROM (
    SELECT
        article_id,
        author,
        wordShingleMinHash(body, 5, 1) AS sig
    FROM articles
) AS a
JOIN (
    SELECT
        article_id,
        author,
        wordShingleMinHash(body, 5, 1) AS sig
    FROM articles
) AS b
ON a.sig = b.sig
    AND a.article_id != b.article_id
    AND a.author != b.author
LIMIT 20;
```

## Summary

`wordShingleMinHash()` and `wordShingleSimHash()` are locality-sensitive hash functions designed for near-duplicate document detection. Unlike regular hash functions, they map similar texts to similar (or identical) hash values. Use `wordShingleMinHash` with a shingle size of 3-5 for most deduplication tasks. These functions are particularly useful for deduplicating news articles, user-generated content, and web crawl data at scale.
