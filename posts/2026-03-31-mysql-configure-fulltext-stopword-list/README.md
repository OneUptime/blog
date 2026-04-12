# How to Configure the Full-Text Stopword List in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Full-Text Search, Stopword, InnoDB, Configuration

Description: Learn how MySQL's full-text stopword list works, how to view the built-in stopwords, and how to replace the default list with a custom table.

---

## What is a Stopword List?

MySQL's full-text search engine skips common words called stopwords when building and querying full-text indexes. Words like "the", "a", "is", and "in" are excluded because they appear so frequently they add no meaningful signal to search results.

InnoDB and MyISAM maintain separate stopword systems. InnoDB uses a built-in compiled list by default, while MyISAM reads stopwords from a file specified by the `ft_stopword_file` system variable.

## Viewing the Built-In Stopword List

InnoDB exposes its default stopwords through a special INFORMATION_SCHEMA table:

```sql
SELECT * FROM INFORMATION_SCHEMA.INNODB_FT_DEFAULT_STOPWORD;
```

```text
+-------+
| value |
+-------+
| a     |
| about |
| an    |
| are   |
| as    |
| at    |
...
```

The built-in list contains 36 common English words.

## System Variables That Control Stopwords

```sql
SHOW VARIABLES LIKE 'innodb_ft_enable_stopword';
SHOW VARIABLES LIKE 'innodb_ft_server_stopword_table';
SHOW VARIABLES LIKE 'innodb_ft_user_stopword_table';
```

| Variable | Purpose |
|---|---|
| `innodb_ft_enable_stopword` | Toggle stopword filtering on or off |
| `innodb_ft_server_stopword_table` | Global custom stopword table (db/table format) |
| `innodb_ft_user_stopword_table` | Session-level custom stopword table |

## Disabling Stopword Filtering

To disable stopword filtering entirely for a session before creating an index:

```sql
SET SESSION innodb_ft_enable_stopword = OFF;
```

To disable it globally in `my.cnf`:

```text
[mysqld]
innodb_ft_enable_stopword = OFF
```

## Using a Custom Stopword Table

The most flexible approach is to create your own stopword table and point InnoDB to it.

```sql
-- Create the custom stopword table
CREATE TABLE my_stopwords (
  value VARCHAR(30) NOT NULL
) ENGINE = InnoDB;

-- Populate it
INSERT INTO my_stopwords (value) VALUES
  ('the'), ('a'), ('an'), ('is'), ('are');

-- Point InnoDB to your table (global, in my.cnf)
SET GLOBAL innodb_ft_server_stopword_table = 'mydb/my_stopwords';
```

After setting the custom table, drop and recreate affected full-text indexes to apply the new stopword list:

```sql
ALTER TABLE articles DROP INDEX ft_body;
ALTER TABLE articles ADD FULLTEXT INDEX ft_body (body);
```

## Session-Level Stopword Override

You can override the stopword table for just the current session, useful when building indexes during data migrations:

```sql
SET SESSION innodb_ft_user_stopword_table = 'mydb/my_stopwords';
```

Session-level settings take precedence over the global `innodb_ft_server_stopword_table`.

## Verifying the Active Stopword List

After setting a custom stopword table, verify it is active before rebuilding indexes:

```sql
SELECT @@GLOBAL.innodb_ft_server_stopword_table;
SELECT @@SESSION.innodb_ft_user_stopword_table;
```

## Summary

MySQL's full-text stopword list filters common words out of InnoDB full-text indexes. The default built-in list covers 36 English words. You can view it via `INFORMATION_SCHEMA.INNODB_FT_DEFAULT_STOPWORD`, disable filtering entirely with `innodb_ft_enable_stopword`, or replace the list with a custom database table using `innodb_ft_server_stopword_table`. Always rebuild full-text indexes after changing stopword configuration.
