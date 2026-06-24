# How to Implement String Similarity Matching in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Similarity, ngramDistance, Fuzzy Search, Text Analytics

Description: Learn how to implement string similarity matching in ClickHouse using ngramDistance, editDistance, and soundex for fuzzy search and deduplication.

---

## String Similarity in ClickHouse

Exact string matching with `=` or `LIKE` misses typos, abbreviations, and formatting variations. ClickHouse provides several string similarity functions for fuzzy matching, useful for deduplication, search, and data quality checks.

## ngramDistance

`ngramDistance` computes a normalized distance based on the symmetric difference of 4-character n-gram multisets. Values range from 0 (identical) to 1 (completely different):

```sql
SELECT
    'ClickHouse' AS s1,
    'Clickhouse' AS s2,
    ngramDistance(s1, s2) AS distance;
-- Returns approximately 0.1
```

Find similar company names for deduplication:

```sql
SELECT
    a.company_name AS name_a,
    b.company_name AS name_b,
    ngramDistance(a.company_name, b.company_name) AS dist
FROM companies a
CROSS JOIN companies b
WHERE a.id < b.id
  AND ngramDistance(a.company_name, b.company_name) < 0.2
ORDER BY dist;
```

## editDistance (Levenshtein)

Count the minimum character edits to transform one string into another:

```sql
SELECT
    product_name,
    editDistance(lower(product_name), lower('iPhone 15 Pro')) AS edit_dist
FROM products
WHERE editDistance(lower(product_name), lower('iPhone 15 Pro')) <= 3
ORDER BY edit_dist;
```

## ngramSearch

`ngramSearch` returns a similarity score (0 to 1, higher is more similar):

```sql
SELECT
    url,
    ngramSearch(url, '/api/users') AS similarity
FROM access_logs
WHERE ngramSearch(url, '/api/users') > 0.5
  AND event_time >= today() - 1
ORDER BY similarity DESC
LIMIT 20;
```

## Case-Insensitive Matching

Use lowercase normalization for consistent matching:

```sql
SELECT
    customer_name,
    ngramDistanceCaseInsensitive(customer_name, 'John Smith') AS dist
FROM customers
WHERE ngramDistanceCaseInsensitive(customer_name, 'John Smith') < 0.3
ORDER BY dist
LIMIT 10;
```

## Finding Duplicate Records

Detect near-duplicate entries in a contacts table:

```sql
SELECT
    a.id AS id_a,
    b.id AS id_b,
    a.email AS email_a,
    b.email AS email_b,
    ngramDistance(a.email, b.email) AS dist
FROM contacts a
JOIN contacts b ON a.id < b.id
    AND a.domain = b.domain
WHERE ngramDistance(a.email, b.email) < 0.15
ORDER BY dist;
```

## Fuzzy Log Pattern Matching

Find log messages similar to a known error pattern:

```sql
SELECT
    message,
    ngramDistance(message, 'connection refused to database') AS dist
FROM app_logs
WHERE event_time >= now() - INTERVAL 1 HOUR
  AND ngramDistance(message, 'connection refused to database') < 0.4
ORDER BY dist
LIMIT 50;
```

## Summary

ClickHouse string similarity functions - `ngramDistance`, `editDistance`, and `ngramSearch` - enable fuzzy matching for deduplication, typo-tolerant search, and log pattern analysis. Case-insensitive variants handle mixed-case data. Use threshold filtering on these functions to find approximate matches without full-text search infrastructure.
