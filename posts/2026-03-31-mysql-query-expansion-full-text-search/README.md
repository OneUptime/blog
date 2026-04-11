# How to Use Query Expansion in Full-Text Search in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, Query Expansion, FULLTEXT, InnoDB

Description: Learn how to use query expansion in MySQL full-text search to automatically broaden results by finding related words from the initial matching documents.

---

## What Is Query Expansion?

Query expansion is a full-text search technique where MySQL performs a two-phase search:

1. A standard natural language search is run first, returning the most relevant results
2. MySQL analyzes the most relevant documents from phase 1 to identify associated words
3. A second search is run using the original terms plus the discovered associated words

The effect is that results expand to include documents that are topically related to the query, even if they do not contain the exact search term. This is useful when users might not know the precise terminology of the documents they are searching.

## Enabling Query Expansion

Use the `WITH QUERY EXPANSION` modifier:

```sql
SELECT id, title
FROM articles
WHERE MATCH(title, body) AGAINST ('database' WITH QUERY EXPANSION);
```

The full form also works:

```sql
SELECT id, title
FROM articles
WHERE MATCH(title, body) AGAINST ('database' IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION);
```

## Setup: Create the Table and Index

```sql
CREATE TABLE docs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255),
    content TEXT,
    FULLTEXT idx_ft (title, content)
);

INSERT INTO docs (title, content) VALUES
('MySQL Optimization', 'Tips for improving MySQL query performance and indexes'),
('InnoDB Storage Engine', 'InnoDB supports ACID transactions and row-level locking'),
('Database Indexing', 'How B-tree and hash indexes work in relational databases'),
('PostgreSQL vs MySQL', 'Comparing two popular open source relational database systems'),
('Redis Caching', 'Using Redis to cache data and reduce database load');
```

## Compare: With and Without Query Expansion

Without expansion - only exact matches on 'database':

```sql
SELECT id, title
FROM docs
WHERE MATCH(title, content) AGAINST ('database');
```

With expansion - includes related concepts like 'InnoDB', 'MySQL', 'indexes':

```sql
SELECT id, title
FROM docs
WHERE MATCH(title, content) AGAINST ('database' WITH QUERY EXPANSION);
```

The second query typically returns more results because MySQL identifies associated vocabulary from the initial matching documents.

## Including Relevance Scores

```sql
SELECT
    id,
    title,
    MATCH(title, content) AGAINST ('database' WITH QUERY EXPANSION) AS relevance
FROM docs
WHERE MATCH(title, content) AGAINST ('database' WITH QUERY EXPANSION)
ORDER BY relevance DESC;
```

## When to Use Query Expansion

Query expansion is best suited for:
- Search-as-you-type scenarios where users enter broad terms
- Knowledge base or documentation search
- Cases where documents use specialized terminology the user might not know
- Exploratory search where users want discovery, not precision

## When Not to Use Query Expansion

Avoid it when:
- Precision is more important than recall (false positives are costly)
- The dataset is very small (not enough context for expansion to work meaningfully)
- Search terms are highly specific identifiers like product codes or names

## Limitation: No Phrase Expansion

Query expansion only works in natural language mode. Boolean mode does not support `WITH QUERY EXPANSION`:

```sql
-- This is NOT valid
SELECT * FROM docs
WHERE MATCH(title, content) AGAINST ('+database' IN BOOLEAN MODE WITH QUERY EXPANSION);
-- ERROR: invalid syntax
```

## Summary

Query expansion in MySQL full-text search automatically broadens search results by identifying related terms from the most relevant initial matches. It improves recall for exploratory searches but reduces precision. Use it when you want to help users discover related content they might not know to search for directly.
