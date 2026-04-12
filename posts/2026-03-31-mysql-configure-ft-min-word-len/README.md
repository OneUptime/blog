# How to Configure ft_min_word_len for Full-Text Search in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, Configuration, MyISAM, InnoDB

Description: Learn how to configure ft_min_word_len and innodb_ft_min_token_size in MySQL to control the minimum word length indexed in full-text search operations.

---

## What Is ft_min_word_len?

MySQL full-text search does not index every word - it ignores short words below a configurable minimum length. The system variable `ft_min_word_len` controls this threshold for MyISAM tables. For InnoDB tables, the equivalent variable is `innodb_ft_min_token_size`.

The default value is `4` for `ft_min_word_len` (MyISAM) and `3` for `innodb_ft_min_token_size` (InnoDB), meaning very short words are not indexed and cannot be searched.

## Why This Matters

```sql
-- This returns NO results by default because 'tag' is only 3 characters
SELECT * FROM posts WHERE MATCH(content) AGAINST ('tag' IN BOOLEAN MODE);
```

If your application frequently searches for short terms like product codes, abbreviations, or 3-letter words, the default setting will silently return no results.

## Check the Current Settings

```sql
-- For MyISAM tables
SHOW VARIABLES LIKE 'ft_min_word_len';

-- For InnoDB tables
SHOW VARIABLES LIKE 'innodb_ft_min_token_size';
```

Typical output:

```text
+--------------------------+-------+
| Variable_name            | Value |
+--------------------------+-------+
| ft_min_word_len          | 4     |
| innodb_ft_min_token_size | 3     |
+--------------------------+-------+
```

Note: InnoDB defaults to 3, MyISAM defaults to 4.

## Changing ft_min_word_len for MyISAM

Edit `/etc/mysql/my.cnf` (or `/etc/my.cnf`):

```text
[mysqld]
ft_min_word_len = 2
```

For InnoDB:

```text
[mysqld]
innodb_ft_min_token_size = 2
```

After editing the configuration file, restart MySQL:

```bash
sudo systemctl restart mysql
```

## Rebuild FULLTEXT Indexes After Changing the Setting

Changing the minimum word length does not automatically update existing indexes. You must rebuild all FULLTEXT indexes:

For MyISAM:

```sql
REPAIR TABLE articles QUICK;
```

For InnoDB:

```sql
-- Drop and recreate the index
ALTER TABLE articles DROP INDEX idx_ft;
ALTER TABLE articles ADD FULLTEXT INDEX idx_ft (title, body);
```

Or for all MyISAM tables at once:

```bash
mysqlcheck -u root -p --repair --all-databases
```

Note: `mysqlcheck --repair` only works for MyISAM tables. For InnoDB, you must drop and recreate each FULLTEXT index as shown above.

## Verify the Change Took Effect

After rebuilding, test that short words are now searchable:

```sql
-- Should now return results if 'id' or 'api' appear in the content
SELECT id, title
FROM articles
WHERE MATCH(title, body) AGAINST ('api' IN BOOLEAN MODE);
```

## ft_stopword_file: Control Stop Words

MySQL also maintains a stop word list - common words that are always excluded from indexing regardless of length. View the default list:

```sql
SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_DEFAULT_STOPWORD;
```

To disable the stop word list entirely for InnoDB:

```text
[mysqld]
innodb_ft_enable_stopword = OFF
```

For MyISAM, set an empty stopword file:

```text
[mysqld]
ft_stopword_file = ''
```

## Choosing the Right Minimum Length

| Use Case | Suggested ft_min_word_len |
|---|---|
| General text content | 3 or 4 (default) |
| Product codes, abbreviations | 2 |
| Single character symbols | 1 (not recommended) |
| Technical documentation | 3 |

Setting the value too low increases index size and may include noise terms. Setting it too high excludes valid search terms.

## Summary

`ft_min_word_len` (MyISAM) and `innodb_ft_min_token_size` (InnoDB) control which words get indexed for full-text search in MySQL. If your searches for short words return no results, lowering these values and rebuilding FULLTEXT indexes resolves the issue. Always rebuild indexes after changing the setting and test your search queries to confirm the change took effect.
