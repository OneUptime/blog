# What Is Full-Text Search in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, MATCH AGAINST, Text Search, InnoDB

Description: Full-text search in MySQL enables relevance-ranked natural language searches and boolean keyword searches across text columns using FULLTEXT indexes.

---

## Overview

Full-text search in MySQL allows you to perform natural language and boolean keyword searches over text columns, with results ranked by relevance. Unlike `LIKE '%keyword%'` which requires a full table scan, full-text search uses a `FULLTEXT` index to find matches efficiently. MySQL supports full-text search on `CHAR`, `VARCHAR`, and `TEXT` columns. InnoDB (MySQL 5.6+) and MyISAM both support FULLTEXT indexes.

## Creating a FULLTEXT Index

```sql
-- Add FULLTEXT index at table creation
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  FULLTEXT INDEX ft_title_body (title, body)
);

-- Add FULLTEXT index to an existing table
ALTER TABLE articles ADD FULLTEXT INDEX ft_title (title);
```

## Natural Language Mode

The default mode, which ranks results by relevance:

```sql
SELECT
  id,
  title,
  MATCH(title, body) AGAINST('MySQL performance tuning') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST('MySQL performance tuning')
ORDER BY relevance DESC;
```

MySQL calculates a relevance score based on word frequency, inverse document frequency, and other factors. For MyISAM tables, words that appear in more than 50% of rows are treated as stopwords and ignored. InnoDB does not apply this 50% threshold but uses document frequency as part of its BM25-based ranking.

## Boolean Mode

Boolean mode allows explicit operators for fine-grained control:

```sql
-- Must contain 'MySQL', may contain 'performance', must not contain 'deprecated'
SELECT title FROM articles
WHERE MATCH(title, body) AGAINST('+MySQL performance -deprecated' IN BOOLEAN MODE);

-- Phrase search
SELECT title FROM articles
WHERE MATCH(title, body) AGAINST('"query optimization"' IN BOOLEAN MODE);

-- Wildcard prefix
SELECT title FROM articles
WHERE MATCH(title, body) AGAINST('optim*' IN BOOLEAN MODE);
```

Boolean operators:
- `+`: word must be present
- `-`: word must not be present
- `*`: wildcard (suffix only)
- `"..."`: exact phrase
- `>`: increase relevance
- `<`: decrease relevance

## Query Expansion Mode

Expands the search to find related terms based on the highest-ranked initial results:

```sql
SELECT title FROM articles
WHERE MATCH(title, body) AGAINST('database' WITH QUERY EXPANSION)
LIMIT 20;
```

Use carefully -- results may include less relevant documents.

## Minimum Word Length

By default InnoDB ignores words shorter than 3 characters (`innodb_ft_min_token_size`). Configure in `my.cnf`:

```ini
[mysqld]
innodb_ft_min_token_size = 2
```

Rebuild the FULLTEXT index after changing this setting:

```sql
ALTER TABLE articles DROP INDEX ft_title_body;
ALTER TABLE articles ADD FULLTEXT INDEX ft_title_body (title, body);
```

## Stopwords

Common words like "the", "is", and "a" are excluded as stopwords. View the default list:

```sql
SELECT * FROM information_schema.INNODB_FT_DEFAULT_STOPWORD;
```

Customize stopwords:

```sql
CREATE TABLE custom_stopwords (value VARCHAR(30));
INSERT INTO custom_stopwords VALUES ('foo'), ('bar');
SET GLOBAL innodb_ft_server_stopword_table = 'mydb/custom_stopwords';
```

## Summary

Full-text search in MySQL provides relevance-ranked text search using FULLTEXT indexes, supporting natural language mode for simple keyword queries, boolean mode for precise control with operators, and query expansion for broader discovery. It is far more efficient than `LIKE '%..%'` on large text datasets and integrates directly with MySQL's SQL interface. For very large scale or advanced search features, external search engines may still be preferable.
