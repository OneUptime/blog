# How to Search Across Multiple Columns with Full-Text Search in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, InnoDB, Index, Query

Description: Learn how to create a composite full-text index and search across multiple columns simultaneously using MATCH AGAINST in MySQL.

---

## Why Search Multiple Columns?

Most content tables have meaningful text in more than one column. A blog post has a title, an excerpt, and a body. A product listing has a name, short description, and full specification. Searching only one column misses relevant matches in the others.

MySQL supports composite full-text indexes that span multiple columns, allowing a single `MATCH AGAINST` expression to search all of them simultaneously.

## Creating a Multi-Column Full-Text Index

Include all columns you want to search in a single `FULLTEXT` index:

```sql
CREATE TABLE articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  excerpt VARCHAR(500),
  body TEXT,
  FULLTEXT INDEX ft_article (title, excerpt, body)
);
```

Or add a full-text index to an existing table:

```sql
ALTER TABLE articles
  ADD FULLTEXT INDEX ft_article (title, excerpt, body);
```

## Querying Multiple Columns

The `MATCH` clause must list the exact same columns as the full-text index:

```sql
SELECT id, title,
  MATCH(title, excerpt, body) AGAINST('connection pooling') AS score
FROM articles
WHERE MATCH(title, excerpt, body) AGAINST('connection pooling')
ORDER BY score DESC
LIMIT 10;
```

If the column list in `MATCH` does not exactly match an existing full-text index, MySQL returns an error.

## Column Order Does Not Affect Relevance

MySQL's full-text relevance ranking is based on term frequency and inverse document frequency (TF-IDF). The order of columns in a `FULLTEXT` index definition does not change how matches are scored. All indexed columns are treated as a single concatenated document.

If you need to weight certain columns higher (for example, boosting title matches over body matches), create separate full-text indexes and combine scores manually:

```sql
ALTER TABLE articles ADD FULLTEXT INDEX ft_title (title);
ALTER TABLE articles ADD FULLTEXT INDEX ft_body (body);

SELECT id, title,
  MATCH(title) AGAINST('search term') * 2 +
  MATCH(body) AGAINST('search term') AS weighted_score
FROM articles
WHERE MATCH(title) AGAINST('search term')
   OR MATCH(body) AGAINST('search term')
ORDER BY weighted_score DESC;
```

## Boolean Mode with Multiple Columns

Boolean mode operators work the same way with multi-column indexes:

```sql
-- Require 'mysql' and optionally boost 'replication'
SELECT id, title
FROM articles
WHERE MATCH(title, excerpt, body)
  AGAINST('+mysql replication -deprecated' IN BOOLEAN MODE)
ORDER BY MATCH(title, excerpt, body)
  AGAINST('+mysql replication -deprecated' IN BOOLEAN MODE) DESC;
```

## You Cannot Mix Indexes in One MATCH

A single `MATCH` expression can only use one full-text index. The columns listed in `MATCH` must exactly correspond to the columns of one full-text index definition:

```sql
-- ERROR: no full-text index is defined on exactly (title, body)
SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('query');
```

If the composite index is `ft_article (title, excerpt, body)`, you must list all three columns:

```sql
-- CORRECT: columns match the composite index exactly
SELECT * FROM articles
WHERE MATCH(title, excerpt, body) AGAINST('query');
```

If you have separate single-column indexes, you can use multiple `MATCH` expressions combined with `OR`:

```sql
-- CORRECT: each MATCH uses its own single-column index
SELECT * FROM articles
WHERE MATCH(title) AGAINST('query')
   OR MATCH(body) AGAINST('query');
```

## Separate Indexes vs Composite Index

If you need to search subsets of columns independently, create separate indexes:

```sql
ALTER TABLE articles ADD FULLTEXT INDEX ft_title (title);
ALTER TABLE articles ADD FULLTEXT INDEX ft_body (body);
ALTER TABLE articles ADD FULLTEXT INDEX ft_all (title, excerpt, body);
```

Each index serves a different query pattern. Use the composite index for broad searches, individual indexes for targeted column searches.

## Checking Which Index Is Used

```sql
EXPLAIN SELECT * FROM articles
WHERE MATCH(title, excerpt, body) AGAINST('performance tuning');
```

The output should show `key: ft_article` confirming the composite full-text index is selected.

## Summary

Multi-column full-text search in MySQL requires a composite `FULLTEXT` index covering all target columns. The `MATCH` clause must list the exact same columns as the index. Column order in the index does not affect relevance scoring. For flexible querying, you can create both composite and single-column full-text indexes on the same table to serve different search patterns.
