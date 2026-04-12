# How to Add Custom Stopwords for Full-Text Search in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, Stopword, InnoDB, Configuration

Description: Step-by-step guide to adding domain-specific custom stopwords to MySQL InnoDB full-text search using a stopword table.

---

## Why Custom Stopwords Matter

MySQL's built-in stopword list covers common English words, but many applications need domain-specific exclusions. A legal document search might want to exclude "plaintiff" and "defendant" because they appear in every record. A software documentation search might exclude "function" or "parameter". Custom stopwords let you fine-tune relevance for your specific data set.

## Creating a Custom Stopword Table

InnoDB reads stopwords from a regular MySQL table. The table must have a single `VARCHAR` column named `value` and use the InnoDB engine.

```sql
CREATE DATABASE IF NOT EXISTS search_config;
USE search_config;

CREATE TABLE custom_stopwords (
  value VARCHAR(30) NOT NULL
) ENGINE = InnoDB CHARACTER SET utf8mb4;
```

## Populating the Stopword Table

Add your domain-specific terms along with any common words you want to exclude:

```sql
INSERT INTO custom_stopwords (value) VALUES
  ('the'), ('a'), ('an'), ('is'), ('are'), ('was'), ('were'),
  ('function'), ('parameter'), ('returns'), ('example'), ('default');
```

You can add or remove stopwords at any time. Changes take effect the next time a full-text index is built or rebuilt.

## Activating the Custom Stopword Table

Set the global server stopword table variable. The format is `database_name/table_name`:

```sql
SET GLOBAL innodb_ft_server_stopword_table = 'search_config/custom_stopwords';
```

To make this permanent, add it to `/etc/mysql/my.cnf`:

```text
[mysqld]
innodb_ft_server_stopword_table = search_config/custom_stopwords
```

## Rebuilding Full-Text Indexes

After activating the custom list, rebuild your full-text indexes. The existing index still uses the old stopword list until you rebuild it.

```sql
-- Example: rebuild on a documentation table
ALTER TABLE docs DROP INDEX ft_content;
ALTER TABLE docs ADD FULLTEXT INDEX ft_content (title, content);
```

Alternatively, you can use `OPTIMIZE TABLE` to rebuild full-text indexes. Set `innodb_optimize_fulltext_only` first so the operation targets the full-text index:

```sql
SET GLOBAL innodb_optimize_fulltext_only = ON;
OPTIMIZE TABLE docs;
SET GLOBAL innodb_optimize_fulltext_only = OFF;
```

## Testing the Custom Stopwords

Verify that previously-common terms are now excluded from search and that meaningful terms still match:

```sql
-- Should return no results if 'function' is a stopword
SELECT COUNT(*) FROM docs
WHERE MATCH(title, content) AGAINST('function' IN BOOLEAN MODE);

-- Should return results for specific technical terms
SELECT title FROM docs
WHERE MATCH(title, content) AGAINST('authentication middleware' IN BOOLEAN MODE);
```

## Managing Stopwords Dynamically

Since the stopword list is just a database table, you can manage it with standard SQL:

```sql
-- Add a new stopword
INSERT INTO search_config.custom_stopwords VALUES ('handler');

-- Remove a stopword
DELETE FROM search_config.custom_stopwords WHERE value = 'default';

-- View all current stopwords
SELECT * FROM search_config.custom_stopwords ORDER BY value;
```

After any changes to the stopword table, rebuild affected full-text indexes for the changes to take effect on existing indexed data.

## Session-Level Override

For testing without affecting the global configuration, use the session-level variable:

```sql
SET SESSION innodb_ft_user_stopword_table = 'search_config/custom_stopwords';
```

This is useful for testing new stopword lists before deploying them globally.

## Summary

Custom stopwords let you exclude domain-specific common words from InnoDB full-text indexes. Create a table with a single `value VARCHAR` column, populate it with your terms, then activate it using `innodb_ft_server_stopword_table`. Rebuild your full-text indexes after any change to the stopword configuration for the changes to take effect.
