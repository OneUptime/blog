# How to Optimize Full-Text Search Queries in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text, Index, Performance, Optimization

Description: Learn how to optimize MySQL full-text search queries with proper FULLTEXT index configuration, Boolean mode operators, and query rewriting techniques.

---

## MySQL Full-Text Search Overview

MySQL's `FULLTEXT` index supports word-level text search through the `MATCH() ... AGAINST()` syntax. Unlike regular B-Tree indexes, FULLTEXT indexes tokenize text into words and build an inverted index for fast word lookups.

Full-text search is far more efficient than `LIKE '%word%'` for searching text columns.

## Creating a FULLTEXT Index

```sql
-- Add FULLTEXT index on one or more text columns
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);

-- Or at CREATE TABLE time
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  body TEXT,
  FULLTEXT(title, body)
);
```

## Natural Language Mode (Default)

Natural language mode searches for relevance - results are ranked by how well they match:

```sql
SELECT id, title,
  MATCH(title, body) AGAINST('database optimization') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST('database optimization');
```

The `MATCH()` in both SELECT and WHERE must use the same column list.

## Boolean Mode for Precise Control

Boolean mode gives you operators for required terms, excluded terms, and phrases:

```sql
-- + means required, - means excluded
SELECT title FROM articles
WHERE MATCH(title, body) AGAINST('+mysql -oracle performance' IN BOOLEAN MODE);

-- Phrase search
SELECT title FROM articles
WHERE MATCH(title, body) AGAINST('"query optimization"' IN BOOLEAN MODE);

-- Prefix search
SELECT title FROM articles
WHERE MATCH(title, body) AGAINST('optim*' IN BOOLEAN MODE);
```

## Query Expansion for Broader Results

```sql
-- WITH QUERY EXPANSION: finds documents related to the search terms
-- even if they don't contain the exact words
SELECT title FROM articles
WHERE MATCH(title, body) AGAINST('mysql' WITH QUERY EXPANSION);
```

Use cautiously - query expansion can return irrelevant results for short queries.

## Minimum Word Length Setting

By default, InnoDB FULLTEXT indexes do not index words shorter than 3 characters:

```sql
-- Check current minimum word length
SHOW VARIABLES LIKE 'innodb_ft_min_token_size';
-- Default: 3

-- Change in my.cnf (requires restart and index rebuild)
-- innodb_ft_min_token_size = 2
```

After changing the setting, rebuild all FULLTEXT indexes by dropping and recreating them:

```sql
-- For InnoDB tables, drop and recreate the FULLTEXT index
ALTER TABLE articles DROP INDEX ft_content;
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);
```

## Combining FULLTEXT with Other Filters

Full-text search works best when you use it for the text match and add other column filters in WHERE:

```sql
-- Efficient: FULLTEXT narrows down to text matches, then status filters
CREATE INDEX idx_status ON articles(status);

SELECT id, title FROM articles
WHERE MATCH(title, body) AGAINST('mysql performance' IN BOOLEAN MODE)
AND status = 'published'
AND created_at > '2024-01-01'
ORDER BY MATCH(title, body) AGAINST('mysql performance' IN BOOLEAN MODE) DESC
LIMIT 20;
```

## Stopwords

MySQL has a built-in stopword list that excludes common words (like "the", "a", "is") from the index:

```sql
-- See the default stopwords
SELECT * FROM information_schema.INNODB_FT_DEFAULT_STOPWORD;

-- Create a custom stopword table
CREATE TABLE custom_stopwords (value VARCHAR(30));
-- Configure in my.cnf: innodb_ft_user_stopword_table=mydb/custom_stopwords
```

## Monitoring FULLTEXT Query Performance

```sql
-- EXPLAIN shows FULLTEXT usage
EXPLAIN SELECT * FROM articles
WHERE MATCH(title, body) AGAINST('optimization');
```

```text
type: fulltext, key: ft_content, Extra: Using where; Ft_hints: sorted
```

`type: fulltext` confirms the FULLTEXT index is used.

## Summary

MySQL FULLTEXT search is dramatically more efficient than `LIKE '%word%'` for text searches. Use Boolean mode for precise control over required and excluded terms, combine MATCH AGAINST with regular WHERE filters on indexed columns for the best performance, and tune `innodb_ft_min_token_size` for your minimum search term length. Always check EXPLAIN to confirm `type: fulltext` is shown, confirming the FULLTEXT index is active.
