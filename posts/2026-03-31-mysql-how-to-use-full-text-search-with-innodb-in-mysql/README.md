# How to Use Full-Text Search with InnoDB in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, InnoDB, Search

Description: Learn how to create and use InnoDB full-text indexes in MySQL, including configuration, search modes, and performance considerations.

---

## InnoDB Full-Text Search Overview

MySQL 5.6+ added full-text search support for InnoDB tables (previously only available for MyISAM). InnoDB full-text search provides:

- FULLTEXT indexes on InnoDB tables
- Natural language and Boolean search modes
- Query expansion search
- Better crash safety than MyISAM

## Creating a FULLTEXT Index on InnoDB

On an existing table:

```sql
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);
```

At table creation:

```sql
CREATE TABLE articles (
  id      INT          NOT NULL AUTO_INCREMENT,
  title   VARCHAR(200) NOT NULL,
  body    TEXT         NOT NULL,
  author  VARCHAR(100),
  created DATETIME,
  PRIMARY KEY (id),
  FULLTEXT INDEX ft_content (title, body)
) ENGINE=InnoDB;
```

## InnoDB-Specific Configuration

```ini
[mysqld]
innodb_ft_min_token_size  = 3    # Minimum word length to index (default: 3)
innodb_ft_max_token_size  = 84   # Maximum word length (default: 84)
innodb_ft_enable_stopword = ON   # Use built-in stopword list
innodb_ft_cache_size      = 8M   # Cache for building FT indexes
```

To apply changes to `innodb_ft_min_token_size`, restart MySQL and rebuild the index:

```sql
ALTER TABLE articles DROP INDEX ft_content;
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);
```

## Natural Language Mode Search

```sql
SELECT id, title,
       MATCH(title, body) AGAINST ('MySQL replication performance') AS score
FROM articles
WHERE MATCH(title, body) AGAINST ('MySQL replication performance')
ORDER BY score DESC
LIMIT 10;
```

Natural language mode ranks results by relevance. InnoDB does not apply the 50% row threshold that MyISAM uses, so common words are only filtered by the stopword list.

## Boolean Mode Search

```sql
SELECT id, title
FROM articles
WHERE MATCH(title, body) AGAINST ('+InnoDB +replication -MyISAM' IN BOOLEAN MODE);
```

## Query Expansion Search

Query expansion automatically adds related terms to the search:

```sql
SELECT id, title
FROM articles
WHERE MATCH(title, body)
      AGAINST ('replication' WITH QUERY EXPANSION)
ORDER BY MATCH(title, body) AGAINST ('replication' WITH QUERY EXPANSION) DESC;
```

MySQL runs the query twice: first to find relevant rows, then again using words from those rows to expand the search.

## Custom Stopwords

Override the built-in stopword table with your own:

```sql
CREATE TABLE my_stopwords (value VARCHAR(30)) ENGINE=InnoDB;
INSERT INTO my_stopwords VALUES ('the'), ('a'), ('mysql'), ('database');

SET GLOBAL innodb_ft_server_stopword_table = 'mydb/my_stopwords';
```

Rebuild the index after changing stopwords:

```sql
ALTER TABLE articles DROP INDEX ft_content;
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, body);
```

## Auxiliary Tables and Internal Structures

InnoDB full-text indexes use internal auxiliary tables. You can inspect them:

```sql
SET GLOBAL innodb_ft_aux_table = 'mydb/articles';

SELECT * FROM information_schema.INNODB_FT_INDEX_CACHE LIMIT 20;
SELECT * FROM information_schema.INNODB_FT_INDEX_TABLE LIMIT 20;
```

## Performance Considerations

InnoDB full-text inserts go to an in-memory cache first, then flush to disk during:
- `OPTIMIZE TABLE`
- Server shutdown
- Cache reaching `innodb_ft_cache_size` or `innodb_ft_total_cache_size` limit

For bulk inserts, use `innodb_optimize_fulltext_only` so that `OPTIMIZE TABLE` only rebuilds the full-text index rather than the entire table:

```sql
SET GLOBAL innodb_optimize_fulltext_only = ON;

-- Bulk insert data here

-- Flush FT cache and rebuild FT index only
OPTIMIZE TABLE articles;
SET GLOBAL innodb_optimize_fulltext_only = OFF;
```

## Checking FULLTEXT Index Info

```sql
SELECT INDEX_NAME, COLUMN_NAME, INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME   = 'articles'
  AND INDEX_TYPE   = 'FULLTEXT';
```

## Summary

InnoDB full-text search is enabled by creating a FULLTEXT index on text columns. Configure `innodb_ft_min_token_size` to control the minimum word length indexed. Use natural language mode for relevance-ranked results, Boolean mode for precise filtering, and query expansion when you want to broaden a search automatically. For bulk loads, temporarily use `innodb_optimize_fulltext_only` to delay index building.
