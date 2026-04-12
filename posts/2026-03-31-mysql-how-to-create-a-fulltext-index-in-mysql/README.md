# How to Create a FULLTEXT Index in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full Text Search, Index, InnoDB, Query Optimization

Description: Learn how to create FULLTEXT indexes in MySQL to enable fast natural language and boolean text searches on VARCHAR and TEXT columns.

---

## Overview

A FULLTEXT index in MySQL enables efficient full-text search on `CHAR`, `VARCHAR`, and `TEXT` columns. Unlike regular B-Tree indexes that work well for exact or prefix matches, FULLTEXT indexes are optimized for searching within large bodies of text.

FULLTEXT indexes use the `MATCH() ... AGAINST()` syntax and support three search modes: natural language, boolean, and query expansion.

## Creating a FULLTEXT Index

You can create a FULLTEXT index at table creation time or add it to an existing table.

### At Table Creation

```sql
CREATE TABLE articles (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FULLTEXT KEY ft_title_body (title, body)
);
```

### On an Existing Table

```sql
-- Using CREATE INDEX
CREATE FULLTEXT INDEX ft_title_body ON articles (title, body);

-- Using ALTER TABLE
ALTER TABLE articles ADD FULLTEXT INDEX ft_title (title);
```

## Natural Language Search

The default search mode finds rows that are relevant to the search string:

```sql
SELECT id, title,
  MATCH(title, body) AGAINST ('MySQL performance tuning') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST ('MySQL performance tuning')
ORDER BY relevance DESC;
```

MySQL assigns a relevance score to each row based on how well it matches the search terms.

## Boolean Mode Search

Boolean mode gives you more control with operators:

```sql
-- Find rows containing 'MySQL' but not 'Oracle'
SELECT id, title FROM articles
WHERE MATCH(title, body) AGAINST ('+MySQL -Oracle' IN BOOLEAN MODE);

-- Find rows containing 'performance' and optionally 'tuning'
SELECT id, title FROM articles
WHERE MATCH(title, body) AGAINST ('+performance tuning' IN BOOLEAN MODE);

-- Find rows containing the exact phrase
SELECT id, title FROM articles
WHERE MATCH(title, body) AGAINST ('"query optimization"' IN BOOLEAN MODE);
```

Boolean mode operators:

```text
+word   - word must be present
-word   - word must not be present
>word   - increases relevance
<word   - decreases relevance
~word   - negate the word's relevance contribution
word*   - prefix wildcard
"phrase" - exact phrase match
```

## Query Expansion Mode

Query expansion performs a two-pass search - first finds relevant rows, then uses words from those rows to expand the search:

```sql
SELECT id, title FROM articles
WHERE MATCH(title, body) AGAINST ('database' WITH QUERY EXPANSION);
```

This can find articles about "MySQL", "PostgreSQL", or "indexing" even if they do not contain the word "database" explicitly.

## Minimum Word Length

By default, MySQL ignores words shorter than 3 characters (InnoDB) or 4 characters (MyISAM). You can check and change this setting:

```sql
-- Check current minimum token size
SHOW VARIABLES LIKE 'innodb_ft_min_token_size';
```

```text
+--------------------------+-------+
| Variable_name            | Value |
+--------------------------+-------+
| innodb_ft_min_token_size | 3     |
+--------------------------+-------+
```

To change it, update `my.cnf`:

```text
[mysqld]
innodb_ft_min_token_size=2
```

Then restart MySQL and rebuild the FULLTEXT index:

```sql
ALTER TABLE articles DROP INDEX ft_title_body;
ALTER TABLE articles ADD FULLTEXT INDEX ft_title_body (title, body);
```

## Stopwords

MySQL has a built-in list of stopwords that are excluded from FULLTEXT indexes (e.g., "the", "a", "is"). To view them:

```sql
SELECT * FROM information_schema.INNODB_FT_DEFAULT_STOPWORD;
```

To disable stopwords:

```sql
SET GLOBAL innodb_ft_enable_stopword = 0;
```

## Checking FULLTEXT Index Status

```sql
SHOW INDEX FROM articles WHERE Index_type = 'FULLTEXT';
```

```text
+----------+------------+----------------+--------------+-------------+------------+
| Table    | Non_unique | Key_name       | Seq_in_index | Column_name | Index_type |
+----------+------------+----------------+--------------+-------------+------------+
| articles |          1 | ft_title_body  |            1 | title       | FULLTEXT   |
| articles |          1 | ft_title_body  |            2 | body        | FULLTEXT   |
+----------+------------+----------------+--------------+-------------+------------+
```

## Summary

FULLTEXT indexes in MySQL enable efficient full-text search on text columns using the `MATCH() ... AGAINST()` syntax. Create them with `CREATE FULLTEXT INDEX` or `ALTER TABLE`, and choose between natural language mode for relevance-ranked results and boolean mode for precise operator-based searches. Configure `innodb_ft_min_token_size` to control the minimum indexed word length when your use case requires short-word searches.
