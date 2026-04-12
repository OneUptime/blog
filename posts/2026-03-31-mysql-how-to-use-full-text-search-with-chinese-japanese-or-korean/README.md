# How to Use Full-Text Search with CJK Text in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, CJK, Unicode, Internationalization

Description: Learn how to configure MySQL full-text search for Chinese, Japanese, and Korean (CJK) text using the ngram parser for character-based tokenization.

---

## The Challenge with CJK Text

Standard MySQL full-text search tokenizes text by whitespace and punctuation. Chinese, Japanese, and Korean (CJK) text typically has no spaces between words, so the default tokenizer produces empty or incorrect token sets.

**Solution:** Use MySQL's built-in `ngram` full-text parser, available since MySQL 5.7.6.

## What Is the ngram Parser

The ngram parser splits text into n-character sequences (n-grams) instead of whitespace-delimited tokens:

- Input: `MySQL数据库性能`
- ngram (n=2): `My`, `yS`, `SQ`, `QL`, `L数`, `数据`, `据库`, `库性`, `性能`

This allows searching for any 2-character substring in the original text.

## Configuring the ngram Token Size

```ini
[mysqld]
ngram_token_size = 2   # Default: 2 characters per token
```

Restart MySQL to apply. Smaller values increase index size but allow shorter search terms.

Check the current value:

```sql
SHOW VARIABLES LIKE 'ngram_token_size';
```

## Creating a FULLTEXT Index with the ngram Parser

```sql
CREATE TABLE articles_cjk (
  id      INT          NOT NULL AUTO_INCREMENT,
  title   VARCHAR(500) NOT NULL,
  body    TEXT         NOT NULL,
  PRIMARY KEY (id),
  FULLTEXT INDEX ft_cjk (title, body) WITH PARSER ngram
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

For an existing table:

```sql
ALTER TABLE articles ADD FULLTEXT INDEX ft_cjk (title, body) WITH PARSER ngram;
```

## Inserting CJK Data

```sql
INSERT INTO articles_cjk (title, body) VALUES
  ('MySQL数据库配置指南', 'InnoDB存储引擎是MySQL的默认存储引擎，提供高性能和事务支持。'),
  ('MySQL性能优化', 'SQL查询优化和索引设计对数据库性能至关重要。'),
  ('データベースのレプリケーション', 'MySQLのレプリケーションにより、データの冗長性を確保できます。');
```

## Searching with Natural Language Mode

```sql
SELECT id, title,
       MATCH(title, body) AGAINST ('数据库' IN NATURAL LANGUAGE MODE) AS score
FROM articles_cjk
WHERE MATCH(title, body) AGAINST ('数据库' IN NATURAL LANGUAGE MODE)
ORDER BY score DESC;
```

## Searching with Boolean Mode

```sql
-- Find rows containing both terms
SELECT id, title
FROM articles_cjk
WHERE MATCH(title, body) AGAINST ('+性能 +优化' IN BOOLEAN MODE);

-- Exclude a term
SELECT id, title
FROM articles_cjk
WHERE MATCH(title, body) AGAINST ('+数据库 -性能' IN BOOLEAN MODE);
```

## Mixed CJK and Latin Searches

The ngram parser also tokenizes Latin text, so mixed searches work:

```sql
SELECT id, title
FROM articles_cjk
WHERE MATCH(title, body) AGAINST ('MySQL性能' IN BOOLEAN MODE);
```

This matches rows containing both "MySQL" and "性能".

## Setting the Correct Character Set

Always use `utf8mb4` for CJK text - it fully supports the Unicode BMP and supplementary characters:

```sql
ALTER TABLE articles_cjk
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Verify:

```sql
SHOW CREATE TABLE articles_cjk\G
```

## Minimum Search Term Length

With `ngram_token_size = 2`, you must search for at least 2 characters. Searching for a single character returns no results:

```sql
-- Returns nothing (too short)
SELECT * FROM articles_cjk WHERE MATCH(title, body) AGAINST ('性' IN BOOLEAN MODE);

-- Works - 2 characters
SELECT * FROM articles_cjk WHERE MATCH(title, body) AGAINST ('性能' IN BOOLEAN MODE);
```

## Index Size Considerations

ngram indexes are significantly larger than standard full-text indexes because every n-gram sequence is indexed. For large CJK text corpora:

- Increase `innodb_ft_cache_size`
- Monitor tablespace growth
- Consider `ngram_token_size = 3` for smaller indexes at the cost of a longer minimum search term length

```ini
[mysqld]
ngram_token_size     = 3
innodb_ft_cache_size = 64M
```

## Summary

MySQL's ngram full-text parser enables accurate full-text search for CJK languages by tokenizing text into n-character sequences. Create FULLTEXT indexes with `WITH PARSER ngram`, use `utf8mb4` character set, and set `ngram_token_size = 2` in `my.cnf`. Search using both natural language and Boolean modes just like standard full-text search.
