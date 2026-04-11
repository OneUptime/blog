# How to Use Natural Language Full-Text Search in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, Natural Language, InnoDB, Query

Description: Learn how to use MySQL natural language full-text search to rank results by relevance using MATCH and AGAINST with practical examples.

---

MySQL's natural language full-text search mode ranks results by relevance rather than returning a simple yes/no match. It is the default mode when using `MATCH ... AGAINST` without specifying a modifier. Understanding how relevance scoring works helps you build effective search features for applications.

## Setting Up a FULLTEXT Index

You need a FULLTEXT index on the columns you want to search. This works with InnoDB (MySQL 5.6+) and MyISAM tables:

```sql
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200),
  body TEXT,
  FULLTEXT INDEX ft_content (title, body)
) ENGINE=InnoDB;
```

Add a FULLTEXT index to an existing table:

```sql
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);
```

## Basic Natural Language Search

Natural language mode is the default. The query returns rows with a relevance score greater than zero:

```sql
SELECT id, title,
  MATCH(title, body) AGAINST ('database performance') AS relevance
FROM articles
WHERE MATCH(title, body) AGAINST ('database performance')
ORDER BY relevance DESC;
```

The relevance score is a non-negative floating-point number. Higher values indicate better matches.

## Understanding Relevance Scoring

Relevance is based on the number of words in the row, the number of unique words, the total number of words in the collection, and how many rows contain the word. For MyISAM tables, words that appear in more than 50% of rows are treated as common and get a relevance of zero - this is called the 50% threshold. InnoDB does not apply the 50% threshold, which is one reason to prefer InnoDB for full-text search.

To see scores alongside results:

```sql
SELECT
  title,
  ROUND(MATCH(title, body) AGAINST ('MySQL indexing optimization'), 4) AS score
FROM articles
WHERE MATCH(title, body) AGAINST ('MySQL indexing optimization')
ORDER BY score DESC
LIMIT 10;
```

## The 50% Threshold and Minimum Word Length

Two settings affect which words are indexed:

```sql
SHOW VARIABLES LIKE 'innodb_ft_min_token_size';
SHOW VARIABLES LIKE 'ft_min_word_len';
```

The default `innodb_ft_min_token_size` is 3, meaning words shorter than 3 characters are not indexed. To index shorter words, change in `my.cnf`:

```bash
[mysqld]
innodb_ft_min_token_size=2
```

After changing, rebuild the index:

```sql
ALTER TABLE articles DROP INDEX ft_content;
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);
```

## Stopwords

MySQL uses a built-in stopword list (common words like "the", "is", "in") that are excluded from full-text indexes. View the InnoDB stopword list:

```sql
SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_DEFAULT_STOPWORD;
```

To use a custom stopword table:

```sql
CREATE TABLE my_stopwords (value VARCHAR(30)) ENGINE=InnoDB;
INSERT INTO my_stopwords VALUES ('example'), ('test');

SET GLOBAL innodb_ft_server_stopword_table = 'mydb/my_stopwords';
```

After changing the stopword table, rebuild existing FULLTEXT indexes for the change to take effect:

```sql
ALTER TABLE articles DROP INDEX ft_content;
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);
```

## Searching Multiple Columns

You can include multiple columns in the MATCH clause, but they must use the same FULLTEXT index:

```sql
SELECT title, MATCH(title, body) AGAINST ('query optimization') AS score
FROM articles
WHERE MATCH(title, body) AGAINST ('query optimization')
ORDER BY score DESC;
```

## Combining Full-Text with Other Conditions

Natural language search works alongside standard WHERE conditions:

```sql
SELECT title, created_at,
  MATCH(title, body) AGAINST ('replication setup') AS score
FROM articles
WHERE created_at > '2024-01-01'
  AND MATCH(title, body) AGAINST ('replication setup')
ORDER BY score DESC
LIMIT 20;
```

## Checking the Query in EXPLAIN

Always verify your full-text queries use the index:

```sql
EXPLAIN SELECT title
FROM articles
WHERE MATCH(title, body) AGAINST ('MySQL replication');
```

Look for `fulltext` in the `type` column in the output. If you see `ALL`, the FULLTEXT index is not being used.

## Summary

MySQL natural language full-text search uses `MATCH ... AGAINST` to return relevance-scored results from FULLTEXT indexed columns. Relevance is calculated based on word frequency across the collection. For MyISAM tables, words appearing in more than 50% of rows score zero, but this threshold does not apply to InnoDB. Key tuning factors include minimum token size and stopword configuration. Combine natural language search with regular WHERE filters for practical application search features.
