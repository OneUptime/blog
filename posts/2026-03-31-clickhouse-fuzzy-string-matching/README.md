# How to Implement Fuzzy String Matching in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Fuzzy Search, String Matching, Analytics, Search

Description: Learn how to implement fuzzy string matching in ClickHouse using edit distance, n-gram similarity, and phonetic functions for approximate lookups.

---

Fuzzy string matching lets you find records even when the search term has typos, alternate spellings, or minor variations. ClickHouse provides several built-in functions that make this straightforward.

## Using Edit Distance

The `editDistance` function computes the Levenshtein distance between two strings - the minimum number of single-character edits needed to transform one string into another.

```sql
SELECT name
FROM users
WHERE editDistance(lower(name), lower('johnn')) <= 2;
```

This finds names within 2 edits of "johnn", catching "John", "Johnny", or "Johanna".

For case-insensitive matching, always `lower()` both sides before comparing.

## N-Gram Distance

The `ngramDistance` function measures the dissimilarity of two strings based on the symmetric difference of their 4-gram multisets, returning a Float32 between 0 and 1. A smaller value means a closer match.

```sql
SELECT
    product_name,
    ngramDistance(lower(product_name), lower('sneakers')) AS score
FROM products
WHERE score < 0.7
ORDER BY score ASC
LIMIT 10;
```

N-gram distance handles transpositions and partial matches well, making it suitable for product name lookups and user search bars.

## Combining Functions for Ranked Results

You can combine both approaches to score candidates:

```sql
SELECT
    name,
    email,
    editDistance(lower(name), lower({query:String})) AS ed,
    ngramDistance(lower(name), lower({query:String})) AS dist
FROM customers
WHERE ed <= 3 OR dist < 0.6
ORDER BY (ed * 0.4 + dist * 0.6)
LIMIT 20;
```

## Phonetic Matching with soundex

For names that sound alike but are spelled differently, use `soundex`:

```sql
SELECT name
FROM customers
WHERE soundex(name) = soundex('Smyth');
-- Returns: Smith, Smythe, Smithe
```

## Practical Indexing Tips

Fuzzy matching scans are expensive. Keep performance acceptable by:

- Pre-filtering with a `LIKE '%partial%'` or bloom filter skip index
- Limiting fuzzy scan to a smaller candidate set from a prefix match
- Using materialized columns to store pre-computed soundex or ngram tokens

```sql
ALTER TABLE customers
ADD COLUMN name_soundex String MATERIALIZED soundex(name);

ALTER TABLE customers
ADD INDEX idx_name_soundex name_soundex TYPE bloom_filter GRANULARITY 1;
```

## Summary

ClickHouse supports fuzzy string matching through `editDistance`, `ngramDistance`, and `soundex`. Combine them to build ranked approximate search queries. To keep scans fast, pre-filter with cheaper conditions or materialize phonetic columns with skip indexes.
